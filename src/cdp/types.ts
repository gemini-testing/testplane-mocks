import type { Protocol } from "puppeteer-core";

export type FetchEvent = {
    requestId: string;
    request: Protocol.Network.Request;
    responseHeaders?: Array<Protocol.Fetch.HeaderEntry>;
    responseStatusCode?: number;
};

export type Headers = Record<string, string>;

export enum FetchInterceptionStage {
    Request = "Request",
    Response = "Response",
}

export enum FetchResourceType {
    XHR = "XHR",
}
