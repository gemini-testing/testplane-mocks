import { CONTINUE, NO_CONTENT, RESET_CONTENT, MOVED_PERMANENTLY, FOUND, NOT_MODIFIED } from "http-codes";
import type { CDPSession } from "puppeteer-core";

import { Store } from "../store";
import { writeMode } from ".";
import type { ApiType } from "../cdp/interceptor";
import type { FetchEvent } from "../cdp/types";

interface MockedXHRInterceptor {
    handler?: (event: FetchEvent, api: ApiType) => Promise<void>;
    enable: () => void;
    listen: (handler: (event: FetchEvent, api: ApiType) => Promise<void>) => void;
}

const mockedXHRInterceptor: MockedXHRInterceptor = {
    enable: jest.fn(),
    listen: function (handler) {
        this.handler = handler;
    },
};

const mockedStore = {
    set: jest.fn(),
} as unknown as Store;

jest.mock("../cdp", () => ({
    ...jest.requireActual("../cdp"),
    mkResponseXHRInterceptor: () => mockedXHRInterceptor,
}));

describe("modes/writeMode", () => {
    beforeEach(async () => {
        await writeMode({} as CDPSession, [], () => mockedStore);
    });

    it("should enable XHR interceptor", async () => {
        expect(mockedXHRInterceptor.enable).toBeCalled();
    });

    describe("listen", () => {
        const handle_ = (
            opts: {
                requestUrl?: string;
                requestId?: string;
                responseHeaders?: { name: string; value: string }[];
                responseStatusCode?: number;
                respondWithMock?: () => Promise<void>;
                getRealResponse?: () => Promise<Buffer>;
            } = {},
        ): Promise<void> => {
            opts.respondWithMock ||= () => Promise.resolve();
            opts.getRealResponse ||= () => Promise.resolve(Buffer.from("body"));

            const api = {
                respondWithMock: opts.respondWithMock,
                getRealResponse: opts.getRealResponse,
            } as unknown as ApiType;

            const event = {
                requestId: opts.requestId || "requestId",
                request: { url: opts.requestUrl || "requestUrl" },
                responseHeaders: opts.responseHeaders || [],
                responseStatusCode: opts.responseStatusCode || 200,
            } as FetchEvent;

            return mockedXHRInterceptor.handler!(event, api);
        };

        it("should set dump in store", async () => {
            await handle_({ requestUrl: "url" });

            expect(mockedStore.set).toBeCalledWith("url", {
                responseCode: 200,
                body: "body",
                headers: {},
            });
        });

        it("should normalize response headers", async () => {
            await handle_({ requestUrl: "url", responseHeaders: [{ name: "foo", value: "bar" }] });

            expect(mockedStore.set).toBeCalledWith("url", {
                responseCode: 200,
                body: "body",
                headers: {
                    foo: "bar",
                },
            });
        });

        it("should respond with mock", async () => {
            const respondWithMock = jest.fn();

            await handle_({ requestId: "id", responseHeaders: [{ name: "foo", value: "bar" }], respondWithMock });

            expect(respondWithMock).toBeCalledWith({
                requestId: "id",
                body: "body",
                responseCode: 200,
                headers: {
                    foo: "bar",
                },
            });
        });

        [CONTINUE, NO_CONTENT, RESET_CONTENT, MOVED_PERMANENTLY, FOUND, NOT_MODIFIED].forEach(responseStatusCode => {
            it(`should not try to get body for ${responseStatusCode} status code`, async () => {
                const getRealResponse = jest.fn();

                await handle_({ responseStatusCode, getRealResponse });

                expect(getRealResponse).not.toBeCalled();
            });
        });
    });
});
