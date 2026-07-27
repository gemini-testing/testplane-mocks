import type { Target, Page } from "puppeteer-core";
import { BrowserContextEmittedEvents } from "puppeteer-core";
import _ from "lodash";
import PQueue from "p-queue";
import os from "os";

import TestplaneMocksError from "./testplaneMocksError";
import { TARGET_PAGE, TEST_MOCKS_ERROR } from "./constants";
import { createWorkersRunner } from "./workers";
import { Store } from "./store";
import { parseConfig } from "./config";
import { attachErrorAsDeepestCause } from "./utils";
import { useModes, readMode, writeMode } from "./modes";
import type { PluginConfig } from "./config";
import type { WorkersRunner } from "./workers/worker";
import type Testplane from "testplane";
import type { Test } from "testplane";
import type { TestWithSessionId } from "./types";

export = (testplane: Testplane, opts: PluginConfig): void => {
    const config = parseConfig(opts);

    if (!config.enabled || testplane.isWorker() || _.isEmpty(config.browsers)) {
        return;
    }

    let workersRunner: WorkersRunner;
    const stores = new Map<string, Store>();
    const queue = new PQueue({ concurrency: os.cpus().length });

    const attachTarget = async (page: Page, sessionId: string): Promise<void> => {
        if (page.isClosed()) {
            return;
        }

        const target = page.target();

        if (target.type() !== TARGET_PAGE) {
            return;
        }

        const session = await target.createCDPSession();
        const { patterns, dumpsKey } = config;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const getStore: () => Store = () => stores.get(sessionId)!;

        const modeArgs = { session, patterns, dumpsKey, getStore };

        await useModes(
            {
                onPlay: () => readMode(modeArgs),
                onCreate: () => writeMode(modeArgs),
                onSave: () => writeMode(modeArgs),
            },
            config.mode,
        );
    };

    testplane.on(testplane.events.RUNNER_START, runner => {
        workersRunner = createWorkersRunner(runner);
    });

    testplane.on(testplane.events.SESSION_START, async (browser, { browserId, sessionId }) => {
        if (!config.browsers.includes(browserId)) {
            return;
        }

        const puppeteer = await browser.getPuppeteer();
        const pages = await puppeteer.pages();

        await Promise.all(
            pages.map(async (page: unknown) => {
                if (!page) {
                    return;
                }

                await attachTarget(page as Page, sessionId);
            }),
        );

        puppeteer.on(BrowserContextEmittedEvents.TargetCreated, async (target: Target) => {
            try {
                const page = await target.page();

                if (!page) {
                    return;
                }

                await attachTarget(page, sessionId);
            } catch (originalError: unknown) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const test = stores.get(sessionId)!.currentTest;
                const originalErrorMessage = (originalError as Error).message;
                const error = new TestplaneMocksError(
                    `Puppeteer couldn't create CDP session (original error: ${originalErrorMessage})`,
                );

                _.set(test, TEST_MOCKS_ERROR, _.get(test, TEST_MOCKS_ERROR, error));
            }
        });
    });

    testplane.on(testplane.events.TEST_BEGIN, test => {
        if (!config.browsers.includes(test.browserId)) {
            return;
        }

        const newStore = new Store(config.dumpsDir, workersRunner, test, config.gzipDumps);

        stores.set((test as TestWithSessionId).sessionId, newStore);
    });

    testplane.intercept(testplane.events.TEST_PASS, ({ data }) => {
        // In soft mode a mocks error must not turn a passing test into a failing one.
        const shouldFail = Boolean(_.get(data, TEST_MOCKS_ERROR)) && !config.softMocksErrors;

        return shouldFail ? { event: testplane.events.TEST_FAIL, data } : undefined;
    });

    testplane.intercept(testplane.events.TEST_FAIL, ({ data }) => {
        const mocksError = _.get(data, TEST_MOCKS_ERROR) as Error | undefined;

        if (!mocksError) {
            return;
        }

        const test = data as Test;

        // In soft mode keep the real failure as the top-level error and hang the mocks
        // error at the deepest cause; otherwise preserve the legacy behavior and overwrite.
        if (config.softMocksErrors && test.err) {
            attachErrorAsDeepestCause(test.err as Error, mocksError);
        } else {
            test.err = mocksError;
        }
    });

    testplane.on(testplane.events.TEST_END, ({ browserId, sessionId }) => {
        if (!config.browsers.includes(browserId)) {
            return;
        }

        useModes(
            {
                onPlay: () => stores.delete(sessionId),
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                onCreate: () => queue.add(() => stores.get(sessionId)!.saveDump({ overwrite: false })),
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                onSave: () => queue.add(() => stores.get(sessionId)!.saveDump({ overwrite: true })),
            },
            config.mode,
        );
    });

    testplane.on(testplane.events.RUNNER_END, () => queue.onIdle());
};
