import type { Target, Page } from "puppeteer-core";
import { BrowserContextEmittedEvents } from "puppeteer-core";
import _ from "lodash";
import PQueue from "p-queue";
import os from "os";

import HermioneMocksError from "./hermioneMocksError";
import { TARGET_PAGE, TEST_MOCKS_ERROR } from "./constants";
import { createWorkersRunner } from "./workers";
import { Store } from "./store";
import { parseConfig } from "./config";
import { useModes, readMode, writeMode } from "./modes";
import type { PluginConfig } from "./config";
import type { WorkersRunner } from "./workers/worker";

export = (hermione: Hermione, opts: PluginConfig): void => {
    const config = parseConfig(opts, hermione.config);

    if (!config.enabled || hermione.isWorker() || _.isEmpty(config.browsers)) {
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const getStore: () => Store = () => stores.get(sessionId)!;

        await useModes(
            {
                onPlay: () => readMode(session, config.hostsPatterns, getStore),
                onCreate: () => writeMode(session, config.hostsPatterns, getStore),
                onSave: () => writeMode(session, config.hostsPatterns, getStore),
            },
            config.mode,
        );
    };

    hermione.on(hermione.events.RUNNER_START, runner => {
        workersRunner = createWorkersRunner(runner);
    });

    hermione.on(hermione.events.SESSION_START, async (browser, { browserId, sessionId }) => {
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
                const error = new HermioneMocksError(
                    `Puppeteer couldn't create CDP session (original error: ${originalErrorMessage})`,
                );

                _.set(test, TEST_MOCKS_ERROR, _.get(test, TEST_MOCKS_ERROR, error));
            }
        });
    });

    hermione.on(hermione.events.TEST_BEGIN, test => {
        if (!config.browsers.includes(test.browserId)) {
            return;
        }

        const newStore = Store.create(config.dumpsDir, workersRunner, test);

        stores.set(test.sessionId, newStore);
    });

    hermione.intercept(hermione.events.TEST_PASS, ({ data }) => {
        return _.get(data, TEST_MOCKS_ERROR) && { event: hermione.events.TEST_FAIL, data };
    });

    hermione.intercept(hermione.events.TEST_FAIL, ({ data }) => {
        if (_.get(data, TEST_MOCKS_ERROR)) {
            const test = data as Hermione.Test;

            test.err = _.get(data, TEST_MOCKS_ERROR);
        }
    });

    hermione.on(hermione.events.TEST_END, ({ browserId, sessionId }) => {
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

    hermione.on(hermione.events.RUNNER_END, () => queue.onIdle());
};
