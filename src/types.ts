import type { Test } from "testplane";
import type { Protocol } from "puppeteer-core";

export enum RunMode {
    Play = "play",
    Save = "save",
    Create = "create",
}

export interface DumpResponse {
    body: string;
    headers: Record<string, string>;
    responseCode: number;
}

export interface Dump {
    requests: {
        [hashKey: string]: string[];
    };
    responses: {
        [responseId: string]: DumpResponse;
    };
}

export type SupportedResourceType = Extract<
    Protocol.Network.ResourceType,
    "Document" | "Stylesheet" | "Image" | "Media" | "Script" | "XHR" | "Fetch"
>;

export interface MocksPattern {
    url: string;
    resources: SupportedResourceType[] | "*";
}

export type TestWithSessionId = Test & { sessionId: string };
