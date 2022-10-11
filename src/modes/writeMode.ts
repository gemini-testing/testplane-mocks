import type { CDPSession } from "puppeteer-core";

import { mkResponseXHRInterceptor, normalizeHeaders } from "../cdp";
import { Store } from "../store";

export async function writeMode(session: CDPSession, patterns: string[], getStore: () => Store): Promise<void> {
    const responseInterceptor = mkResponseXHRInterceptor(session, patterns);

    responseInterceptor.listen(async ({ requestId, request, responseHeaders, responseStatusCode }, api) => {
        const store = getStore();
        const rawBody = await api.getRealResponse(requestId);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const responseCode = responseStatusCode!;
        const headers = normalizeHeaders(responseHeaders);
        const body = rawBody.toString("binary");

        await store.set(request.url, { responseCode, headers, body });

        await api.respondWithMock({
            requestId,
            responseCode,
            headers,
            body,
        });
    });

    await responseInterceptor.enable();
}
