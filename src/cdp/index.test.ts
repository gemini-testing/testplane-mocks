import { CDPSession } from "puppeteer-core";
import { CdpInterceptor } from "./interceptor";
import { mkRequestXHRInterceptor, mkResponseXHRInterceptor, normalizeHeaders, createResponseHeaders } from ".";
import { FetchInterceptionStage, FetchResourceType } from "./types";

jest.mock("./interceptor", () => ({
    CdpInterceptor: jest.fn(),
}));

const mockedInterceptor = <jest.Mock<CdpInterceptor>>CdpInterceptor;

describe("cdp", () => {
    beforeEach(() => {
        mockedInterceptor.mockClear();
    });

    it("should create request XHR Interceptor", () => {
        const session = {} as CDPSession;
        const patterns: string[] = [];

        mkRequestXHRInterceptor(session, patterns);

        expect(mockedInterceptor).toHaveBeenLastCalledWith(
            session,
            FetchResourceType.XHR,
            FetchInterceptionStage.Request,
            patterns,
        );
    });

    it("should create response XHR Interceptor", () => {
        const session = {} as CDPSession;
        const patterns: string[] = [];

        mkResponseXHRInterceptor(session, patterns);

        expect(mockedInterceptor).toHaveBeenLastCalledWith(
            session,
            FetchResourceType.XHR,
            FetchInterceptionStage.Response,
            patterns,
        );
    });

    describe("normalizeHeaders", () => {
        it("should return empty object if no headers are given", () => {
            expect(normalizeHeaders()).toMatchObject({});
        });

        it("should normalize headers", () => {
            expect(normalizeHeaders([{ name: "foo", value: "bar" }])).toMatchObject({ foo: "bar" });
        });
    });

    it("should create response headers", () => {
        expect(createResponseHeaders({ foo: "bar" })).toMatchObject([{ name: "foo", value: "bar" }]);
    });
});
