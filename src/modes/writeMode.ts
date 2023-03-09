import _ from "lodash";
import type { CDPSession } from "puppeteer-core";
import { NO_CONTENT, RESET_CONTENT, MOVED_PERMANENTLY, FOUND, NOT_MODIFIED } from "http-codes";

import HermioneMocksError from "../hermioneMocksError";
import { TEST_MOCKS_ERROR } from "../constants";
import { mkResponseXHRInterceptor, normalizeHeaders } from "../cdp";
import { Store } from "../store";
import { MocksPattern } from "../types";

function hasNoBody(statusCode: number): boolean {
    const isInformational = statusCode >= 100 && statusCode < 200;

    return isInformational || [NO_CONTENT, RESET_CONTENT, MOVED_PERMANENTLY, FOUND, NOT_MODIFIED].includes(statusCode);
}

export async function writeMode(session: CDPSession, patterns: MocksPattern[], getStore: () => Store): Promise<void> {
    const responseInterceptor = mkResponseXHRInterceptor(session, patterns);

    responseInterceptor.listen(async ({ requestId, request, responseHeaders, responseStatusCode }, api) => {
        const store = getStore();

        try {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const responseCode = responseStatusCode!;
            const headers = normalizeHeaders(responseHeaders);
            const body = hasNoBody(responseCode)
                ? ""
                : await api.getRealResponse(requestId).then(res => res.toString("binary"));

            store.set(request.url, { responseCode, headers, body });

            await api.respondWithMock({
                requestId,
                responseCode,
                headers,
                body,
            });
        } catch (err: unknown) {
            const errMessage = (err as Error).message;
            const error = _.get(store.currentTest, TEST_MOCKS_ERROR, new HermioneMocksError(errMessage));

            _.set(store.currentTest, TEST_MOCKS_ERROR, error);
        }
    });

    await responseInterceptor.enable();
}
