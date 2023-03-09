import _ from "lodash";
import type { CDPSession } from "puppeteer-core";

import { Store } from "../store";
import { readMode } from ".";
import type { ApiType } from "../cdp/interceptor";
import type { FetchEvent } from "../cdp/types";
import HermioneMocksError from "../hermioneMocksError";
import { TEST_MOCKS_ERROR } from "../constants";

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

jest.mock("../cdp", () => ({
    mkRequestXHRInterceptor: () => mockedXHRInterceptor,
}));

describe("modes/readMode", () => {
    let mockedStore: Store;
    let dumpsKey: jest.MockedFn<(requestUrl: string) => string>;

    beforeEach(async () => {
        dumpsKey = jest.fn().mockImplementation(_.identity);
        mockedStore = {
            get: jest.fn(),
            currentTest: {},
        } as unknown as Store;

        await readMode({
            session: {} as CDPSession,
            patterns: [],
            dumpsKey,
            getStore: () => mockedStore,
        });
    });

    it("should enable XHR interceptor", async () => {
        expect(mockedXHRInterceptor.enable).toBeCalled();
    });

    describe("listen", () => {
        const handle_ = (
            opts: {
                requestUrl?: string;
                requestId?: string;
                respondWithMock?: () => void;
            } = {},
        ): Promise<void> => {
            const api = { respondWithMock: opts.respondWithMock } as unknown as ApiType;
            const event = {
                request: { url: opts.requestUrl || "requestUrl" },
                requestId: opts.requestId || "requestId",
            } as FetchEvent;

            return mockedXHRInterceptor.handler!(event, api);
        };

        it("should get dump from store", async () => {
            await handle_({ requestUrl: "url" });

            expect(mockedStore.get).toBeCalledWith("url");
        });

        it("should create key with 'dumpsKey' function", async () => {
            dumpsKey.mockReturnValueOnce("anotherUrl");

            await handle_({ requestUrl: "url" });

            expect(dumpsKey).toBeCalledWith("url");
            expect(mockedStore.get).toBeCalledWith("anotherUrl");
        });

        it("should set error if dump does not exist", async () => {
            await handle_({ requestUrl: "url" });

            expect(_.get(mockedStore.currentTest, TEST_MOCKS_ERROR)).toBeInstanceOf(HermioneMocksError);
        });

        it("should respond with mock", async () => {
            const respondWithMock = jest.fn();
            mockedStore.get = jest.fn().mockResolvedValue({ foo: "bar" });

            await handle_({ requestId: "id", respondWithMock });

            expect(respondWithMock).toBeCalledWith({
                requestId: "id",
                foo: "bar",
            });
        });
    });
});
