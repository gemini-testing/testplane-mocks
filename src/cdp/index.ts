import type { CDPSession, Protocol } from "puppeteer-core";

import { CdpInterceptor } from "./interceptor";
import { FetchResourceType, FetchInterceptionStage } from "./types";
import type { Headers } from "./types";

export const mkRequestXHRInterceptor = (session: CDPSession, patterns: string[]): CdpInterceptor =>
    new CdpInterceptor(session, FetchResourceType.XHR, FetchInterceptionStage.Request, patterns);

export const mkResponseXHRInterceptor = (session: CDPSession, patterns: string[]): CdpInterceptor =>
    new CdpInterceptor(session, FetchResourceType.XHR, FetchInterceptionStage.Response, patterns);

export function normalizeHeaders(headers: Array<Protocol.Fetch.HeaderEntry> | undefined = []): Record<string, string> {
    return headers.reduce((table, { name, value }) => {
        const key = name.toLowerCase();

        return Object.assign(table, { [key]: value });
    }, {});
}

export function createResponseHeaders(headers: Headers): Array<Protocol.Fetch.HeaderEntry> {
    return Object.entries(headers).map(([name, value]) => ({
        name,
        value,
    }));
}
