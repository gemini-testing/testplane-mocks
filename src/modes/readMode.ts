import type { CDPSession } from "puppeteer-core";

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
            console.error(`Cache is empty:\nkey=${request.url}`);
        }
    });

    await requestInterceptor.enable();
}
