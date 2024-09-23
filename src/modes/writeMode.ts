import _ from "lodash";
import type { CDPSession } from "puppeteer-core";
import { NO_CONTENT, RESET_CONTENT, MOVED_PERMANENTLY, FOUND, NOT_MODIFIED } from "http-codes";

import TestplaneMocksError from "../testplaneMocksError";
import { TEST_MOCKS_ERROR } from "../constants";
import { mkResponseXHRInterceptor, normalizeHeaders } from "../cdp";
import { Store } from "../store";
import { MocksPattern } from "../types";

interface WriteModeArgs {
    session: CDPSession;
    patterns: MocksPattern[];
    dumpsKey: (requestUrl: string) => string;
    getStore: () => Store;
}

function hasNoBody(statusCode: number): boolean {
    const isInformational = statusCode >= 100 && statusCode < 200;

    return isInformational || [NO_CONTENT, RESET_CONTENT, MOVED_PERMANENTLY, FOUND, NOT_MODIFIED].includes(statusCode);
}

export async function writeMode({ session, patterns, dumpsKey, getStore }: WriteModeArgs): Promise<void> {
    const responseInterceptor = mkResponseXHRInterceptor(session, patterns);

    responseInterceptor.listen(async ({ requestId, request, responseHeaders, responseStatusCode }, api) => {
        const store = getStore();

        try {
            const dumpKey = dumpsKey(request.url);
            const responseCode = responseStatusCode!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
            const headers = normalizeHeaders(responseHeaders);
            const body = hasNoBody(responseCode)
                ? ""
                : await api.getRealResponse(requestId).then(res => res.toString("binary"));

            store.set(dumpKey, { responseCode, headers, body });

            await api.respondWithMock({
                requestId,
                responseCode,
                headers,
                body,
            });
        } catch (err: unknown) {
            const errMessage = (err as Error).message;
            const error = _.get(store.currentTest, TEST_MOCKS_ERROR, new TestplaneMocksError(errMessage));

            _.set(store.currentTest, TEST_MOCKS_ERROR, error);
        }
    });

    await responseInterceptor.enable();
}
