import _ from "lodash";
import type { CDPSession } from "puppeteer-core";

import HermioneMocksError from "../hermioneMocksError";
import { TEST_MOCKS_ERROR } from "../constants";
import { mkRequestXHRInterceptor } from "../cdp";
import { Store } from "../store";
import { MocksPattern } from "../types";

interface ReadModeArgs {
    session: CDPSession;
    patterns: MocksPattern[];
    dumpsKey: (requestUrl: string) => string;
    getStore: () => Store;
}

export async function readMode({ session, patterns, dumpsKey, getStore }: ReadModeArgs): Promise<void> {
    const requestInterceptor = mkRequestXHRInterceptor(session, patterns);

    requestInterceptor.listen(async ({ requestId, request }, api) => {
        const store = getStore();

        try {
            const dumpKey = dumpsKey(request.url);
            const dumpResponse = await store.get(dumpKey);

            if (dumpResponse) {
                await api.respondWithMock({
                    requestId,
                    ...dumpResponse,
                });
            } else {
                const errMessage = `Cache is empty:\nkey=${dumpKey}`;
                const error = _.get(store.currentTest, TEST_MOCKS_ERROR, new HermioneMocksError(errMessage));

                _.set(store.currentTest, TEST_MOCKS_ERROR, error);
            }
        } catch (err: unknown) {
            const errMessage = (err as Error).message;
            const error = _.get(store.currentTest, TEST_MOCKS_ERROR, new HermioneMocksError(errMessage));

            _.set(store.currentTest, TEST_MOCKS_ERROR, error);
        }
    });

    await requestInterceptor.enable();
}
