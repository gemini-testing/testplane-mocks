import _ from "lodash";
import type { CDPSession } from "puppeteer-core";

import HermioneMocksError from "../hermioneMocksError";
import { TEST_MOCKS_ERROR } from "../constants";
import { mkRequestXHRInterceptor } from "../cdp";
import { Store } from "../store";

export async function readMode(session: CDPSession, patterns: string[], getStore: () => Store): Promise<void> {
    const requestInterceptor = mkRequestXHRInterceptor(session, patterns);

    requestInterceptor.listen(async ({ requestId, request }, api) => {
        const store = getStore();
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
    });

    await requestInterceptor.enable();
}
