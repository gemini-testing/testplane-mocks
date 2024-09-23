import { createHash } from "crypto";
import path from "path";
import _ from "lodash";
import { Test } from "testplane";

import type { WorkersRunner } from "./workers/worker";
import type { Dump, DumpResponse } from "./types";

export class Store {
    private dump?: Dump;
    private queryCounter: Map<string, number> | null = null;

    constructor(
        private dumpsDir: string | ((test: Test) => string),
        private workersRunner: WorkersRunner,
        private test: Test,
        private gzipDumps: boolean,
    ) {}

    public get currentTest(): Test {
        return this.test;
    }

    public async saveDump({ overwrite }: { overwrite?: boolean }): Promise<void> {
        const dumpPath = this.getDumpPath();

        if (this.dump) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await this.workersRunner.writeDump(dumpPath, this.dump!, {
                overwrite,
                gzipDumps: this.gzipDumps,
            });
        }

        delete this.dump;
    }

    public async get(hashKey: string): Promise<DumpResponse | null> {
        if (!this.dump) {
            const dumpPath = this.getDumpPath();

            this.dump = await this.workersRunner.readDump(dumpPath, { gzipDumps: this.gzipDumps });
        }

        const ind = this.getResponseIndex(hashKey);
        const requestId = this.dump.requests?.[hashKey]?.[ind];

        return (requestId && this.dump.responses[requestId]) || null;
    }

    public set(hashKey: string, response: DumpResponse): void {
        if (!this.dump) {
            this.dump = {
                requests: {},
                responses: {},
            };
        }

        const responseHash = this.getResponseHash(response);

        this.dump.requests[hashKey] = this.dump.requests[hashKey] || [];
        this.dump.requests[hashKey].push(responseHash);
        this.dump.responses[responseHash] = response;
    }

    private getDumpPath(): string {
        const fileName = this.getFileName();
        return _.isFunction(this.dumpsDir)
            ? path.resolve(this.dumpsDir(this.test), fileName)
            : path.resolve(process.cwd(), this.dumpsDir, fileName);
    }

    private getFileName(): string {
        const fileNameString = `${this.test.fullTitle()}#${this.test.browserId}`;
        const base64 = createHash("md5").update(fileNameString, "ascii").digest("base64");

        return base64.slice(0, 8).replace(/\//g, "#");
    }

    private getResponseHash({ responseCode, body, headers }: DumpResponse): string {
        const responseString = `${responseCode}#${body}#${Object.values(headers).join("#")}`;

        return createHash("md5").update(responseString, "utf8").digest("hex");
    }

    private getResponseIndex(hashKey: string): number {
        this.queryCounter = this.queryCounter || new Map();

        const ind = this.queryCounter.get(hashKey) || 0;

        this.queryCounter.set(hashKey, ind + 1);

        return ind;
    }
}
