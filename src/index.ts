import { Page, Target } from "puppeteer-core";
import PQueue from "p-queue";
import os from "os";

import { createWorkersRunner } from "./workers";
import { Store } from "./store";
import { parseConfig } from "./config";
import { useModes, readMode, writeMode } from "./modes";
import type { PluginConfig } from "./config";
import type { WorkersRunner } from "./workers/worker";

export = (hermione: Hermione, opts: PluginConfig): void => {
    const config = parseConfig(opts, hermione.config);

    if (!config.enabled || hermione.isWorker()) {
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

        if (target.type() !== "page") {
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

        puppeteer.on("targetcreated", async (target: Target) => {
            const page = await target.page();

            if (!page) {
                return;
            }

            await attachTarget(page, sessionId);
        });
    });

    hermione.on(hermione.events.TEST_BEGIN, test => {
        if (!config.browsers.includes(test.browserId)) {
            return;
        }

        const newStore = Store.create(config.dumpsDir, workersRunner, test);

        stores.set(test.sessionId, newStore);
    });

    hermione.on(hermione.events.TEST_PASS, ({ browserId, sessionId }) => {
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

    hermione.on(hermione.events.TEST_FAIL, ({ browserId, sessionId }) => {
        if (!config.browsers.includes(browserId)) {
            return;
        }

        stores.delete(sessionId);
    });

    hermione.on(hermione.events.RUNNER_END, () => queue.onIdle());
};
