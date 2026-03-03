import btoa from "btoa";
import type { CDPSession, Protocol } from "puppeteer-core";
import zlib from "zlib";
import { promisify } from "util";

import { FetchInterceptionStage } from "./types";
import { createResponseHeaders } from ".";
import type { FetchEvent, Headers } from "./types";
import type { MocksPattern } from "../types";
import { SUPPORTED_RESOURCE_TYPES } from "../constants";

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

type RespondWithMockParams = {
    requestId: string;
    body: string;
    headers: Headers;
    responseCode?: number;
};

export type ApiType = {
    respondWithMock: (params: RespondWithMockParams) => Promise<void>;
    getRealResponse: (requestId: string, responseHeaders?: Headers) => Promise<Buffer>;
    continueRequest(requestId: string): Promise<void>;
};

export class CdpInterceptor {
    constructor(
        protected readonly session: CDPSession,
        private readonly patterns: MocksPattern[],
        private readonly stage: FetchInterceptionStage,
    ) {}

    public async enable(): Promise<void> {
        const patterns: Protocol.Fetch.RequestPattern[] = [];

        this.patterns.forEach(({ url: urlPattern, resources }) => {
            const resourceTypes = resources === "*" ? SUPPORTED_RESOURCE_TYPES : resources;

            resourceTypes.forEach(resourceType =>
                patterns.push({
                    resourceType,
                    urlPattern,
                    requestStage: this.stage,
                }),
            );
        });

        await this.session.send("Fetch.enable", { patterns });
    }

    public listen(handler: (event: FetchEvent, api: ApiType) => Promise<void>): void {
        this.session.on("Fetch.requestPaused", async event => handler(event, this.api));
    }

    protected get api(): ApiType {
        return {
            respondWithMock: (params: RespondWithMockParams) => this.respondWithMock(params),
            getRealResponse: (requestId: string, headers?: Headers) => this.getRealResponse(requestId, headers),
            continueRequest: (requestId: string) => this.continueRequest(requestId),
        };
    }

    protected async continueRequest(requestId: string): Promise<void> {
        await this.session.send("Fetch.continueRequest", {
            requestId,
        });
    }

    protected async respondWithMock({
        requestId,
        body,
        headers,
        responseCode = 200,
    }: RespondWithMockParams): Promise<void> {
        await this.session.send("Fetch.fulfillRequest", {
            requestId,
            responseCode,
            responseHeaders: createResponseHeaders(headers),
            body: btoa(body),
        });
    }

    protected async getRealResponse(requestId: string, responseHeaders: Headers = {}): Promise<Buffer> {
        const interceptionResponse = await this.session.send("Fetch.getResponseBody", { requestId });

        let body = Buffer.from(interceptionResponse.body, interceptionResponse.base64Encoded ? "base64" : "utf8");

        const contentEncoding = responseHeaders["content-encoding"] || responseHeaders["Content-Encoding"];

        if (contentEncoding) {
            body = await this.decodeBody(body, contentEncoding);
        }

        return body;
    }

    private async decodeBody(body: Buffer, encoding: string): Promise<Buffer> {
        const normalized = encoding.toLowerCase();

        try {
            if (normalized.includes("gzip")) {
                return gunzip(body);
            }

            if (normalized.includes("deflate")) {
                return await inflate(body);
            }

            if (normalized.includes("br")) {
                return await brotliDecompress(body);
            }

            return body;
        } catch (e) {
            return body;
        }
    }
}
