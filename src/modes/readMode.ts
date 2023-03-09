import _ from "lodash";
import type { CDPSession } from "puppeteer-core";

import HermioneMocksError from "../hermioneMocksError";
import { TEST_MOCKS_ERROR } from "../constants";
import { mkRequestXHRInterceptor } from "../cdp";
import { Store } from "../store";
import { MocksPattern } from "../types";

export async function readMode(session: CDPSession, patterns: MocksPattern[], getStore: () => Store): Promise<void> {
    const requestInterceptor = mkRequestXHRInterceptor(session, patterns);

    requestInterceptor.listen(async ({ requestId, request }, api) => {
        const store = getStore();

        try {
            const dumpResponse = await store.get(request.url);

            if (dumpResponse) {
                await api.respondWithMock({
                    requestId,
                    ...dumpResponse,
                });
            } else {
                const err = new HermioneMocksError(`Cache is empty:\nkey=${request.url}`);

                _.set(store.currentTest, TEST_MOCKS_ERROR, err);
            }
        } catch (err: unknown) {
            const errMessage = (err as Error).message;
            const error = _.get(store.currentTest, TEST_MOCKS_ERROR, new HermioneMocksError(errMessage));

            _.set(store.currentTest, TEST_MOCKS_ERROR, error);
        }
    });

    await requestInterceptor.enable();
}
