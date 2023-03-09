import btoa from "btoa";
import type { CDPSession } from "puppeteer-core";
import type { MocksPattern } from "../types";
import type { ApiType } from "./interceptor";
import { SUPPORTED_RESOURCE_TYPES } from "../constants";
import { CdpInterceptor } from "./interceptor";
import { FetchInterceptionStage } from "./types";

describe("cdp/interceptor", () => {
    let interceptor: CdpInterceptor;
    let session: {
        send: jest.SpyInstance;
        on: jest.SpyInstance;
    };
    const patterns: MocksPattern[] = [
        { url: "foo", resources: ["XHR", "Document"] },
        { url: "bar", resources: ["Image"] },
    ];

    beforeEach(() => {
        session = {
            send: jest.fn(),
            on: jest.fn(),
        };

        interceptor = new CdpInterceptor(session as unknown as CDPSession, patterns, FetchInterceptionStage.Request);
    });

    describe("enable", () => {
        it("should send 'enable' command with passed params", async () => {
            await interceptor.enable();

            expect(session.send).toBeCalledWith("Fetch.enable", {
                patterns: [
                    {
                        urlPattern: "foo",
                        requestStage: "Request",
                        resourceType: "XHR",
                    },
                    {
                        urlPattern: "foo",
                        requestStage: "Request",
                        resourceType: "Document",
                    },
                    {
                        urlPattern: "bar",
                        requestStage: "Request",
                        resourceType: "Image",
                    },
                ],
            });
        });

        it("should enable all resource types if '*' is passed", async () => {
            const patterns = SUPPORTED_RESOURCE_TYPES.map(resourceType => ({
                urlPattern: "foo",
                requestStage: "Request",
                resourceType,
            }));
            interceptor = new CdpInterceptor(
                session as unknown as CDPSession,
                [{ url: "foo", resources: "*" }],
                FetchInterceptionStage.Request,
            );

            await interceptor.enable();

            expect(session.send).toBeCalledWith("Fetch.enable", { patterns });
        });
    });

    describe("listen", () => {
        it("should subscribe on requests", async () => {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            interceptor.listen(async () => {});

            expect(session.on).toBeCalledWith("Fetch.requestPaused", expect.any(Function));
        });

        it("should call listener with API", async () => {
            const listener = jest.fn();

            interceptor.listen(listener);

            const [[, callListener]] = session.on.mock.calls;

            await callListener("event-name");

            expect(listener).toBeCalledWith(
                "event-name",
                expect.objectContaining({
                    continueRequest: expect.any(Function),
                    getRealResponse: expect.any(Function),
                    respondWithMock: expect.any(Function),
                }),
            );
        });
    });

    describe("API", () => {
        let api: ApiType;

        beforeEach(async () => {
            const listener = jest.fn();

            interceptor.listen(listener);

            const [[, callListener]] = session.on.mock.calls;

            await callListener("event-name");

            const [[, passedApi]] = listener.mock.calls;

            api = passedApi;
        });

        describe("continueRequest", () => {
            it("should send original request", async () => {
                await api.continueRequest("some-id");

                expect(session.send).toBeCalledWith("Fetch.continueRequest", { requestId: "some-id" });
            });
        });

        describe("getRealResponse", () => {
            it("should get data in buffer", async () => {
                session.send.mockResolvedValue({
                    body: "data",
                    base64Encoded: false,
                });

                const data = await api.getRealResponse("some-id");

                expect(session.send).toBeCalledWith("Fetch.getResponseBody", { requestId: "some-id" });
                expect(data).toBeInstanceOf(Buffer);
            });

            it("should not decode data if there is no such marker", async () => {
                session.send.mockResolvedValue({
                    body: "data",
                    base64Encoded: false,
                });

                const data = await api.getRealResponse("some-id");

                expect(data.toString()).toEqual("data");
            });

            it("should encode data if there is such marker", async () => {
                session.send.mockResolvedValue({
                    body: btoa("data"),
                    base64Encoded: true,
                });

                const data = await api.getRealResponse("some-id");

                expect(data.toString()).toEqual("data");
            });
        });

        describe("respondWithMock", () => {
            it("should send fulfill command", async () => {
                await api.respondWithMock({ requestId: "some-id", body: "", headers: {} });

                expect(session.send).toBeCalledWith(
                    "Fetch.fulfillRequest",
                    expect.objectContaining({
                        requestId: expect.anything(),
                        body: expect.anything(),
                        responseHeaders: expect.anything(),
                        responseCode: expect.anything(),
                    }),
                );
            });

            it("should use default `200` response code", async () => {
                await api.respondWithMock({ requestId: "some-id", body: "", headers: {} });

                expect(session.send).toBeCalledWith(
                    "Fetch.fulfillRequest",
                    expect.objectContaining({
                        responseCode: 200,
                    }),
                );
            });

            it("should transform headers to pairs", async () => {
                await api.respondWithMock({ requestId: "some-id", body: "", headers: { "content-type": "image" } });

                expect(session.send).toBeCalledWith(
                    "Fetch.fulfillRequest",
                    expect.objectContaining({
                        responseHeaders: [
                            {
                                name: "content-type",
                                value: "image",
                            },
                        ],
                    }),
                );
            });

            it("should encode body data to base64-asci", async () => {
                await api.respondWithMock({
                    requestId: "some-id",
                    body: "data",
                    headers: {},
                });

                expect(session.send).toBeCalledWith(
                    "Fetch.fulfillRequest",
                    expect.objectContaining({
                        body: "ZGF0YQ==",
                    }),
                );
            });
        });
    });
});
