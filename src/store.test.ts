import path from "path";
import type Hermione from "hermione";
import { Store } from "./store";
import { Dump, DumpResponse } from "./types";
import { WorkersRunner } from "./workers/worker";

type ResponseWithHash = { hash: string; response: DumpResponse };

describe("store", () => {
    let workersRunner: WorkersRunner;
    let test: Hermione.Test;
    let fResponse: ResponseWithHash;
    let sResponse: ResponseWithHash;

    type createStore = (opts?: {
        dumpsDir?: string | ((test: Hermione.Test) => string);
        workersRunner?: WorkersRunner;
        test?: Hermione.Test;
        gzipDumps?: boolean;
    }) => Store;

    const createStore_: createStore = (opts = {}) => {
        opts.dumpsDir ??= "dumps-dir";
        opts.workersRunner ??= workersRunner;
        opts.test ??= test;
        opts.gzipDumps ??= true;

        return new Store(opts.dumpsDir, opts.workersRunner, opts.test, opts.gzipDumps);
    };

    beforeEach(() => {
        fResponse = {
            hash: "2104df60581c70a4dd237cada6e4addd",
            response: {
                responseCode: 200,
                headers: { headerKey: "headerValue" },
                body: "body",
            },
        };
        sResponse = {
            hash: "5f5adae8bd9c6084b5fb84f0d721df4d",
            response: {
                responseCode: 200,
                headers: { headerKey: "headerValue" },
                body: "body2",
            },
        };
        workersRunner = {
            readDump: jest.fn().mockImplementation((dumpPath: string) => {
                const mockFileName = "uGDzURz0";

                if (!dumpPath.includes(mockFileName)) {
                    return null;
                }

                return {
                    requests: {
                        testUrl: [fResponse.hash, sResponse.hash],
                    },
                    responses: {
                        [fResponse.hash]: fResponse.response,
                        [sResponse.hash]: sResponse.response,
                    },
                };
            }),
            writeDump: jest.fn(),
        };

        test = {
            fullTitle: jest.fn().mockReturnValue("fullTitle"),
            browserId: "browserId",
        } as unknown as Hermione.Test;
    });

    describe("dumpsDir", () => {
        it("should read dumps from dumpsDir as string", async () => {
            const store = createStore_({ dumpsDir: "specified" });

            await store.get("testUrl");

            const dumpPath = path.resolve(process.cwd(), "specified", "uGDzURz0");
            expect(workersRunner.readDump).toBeCalledWith(dumpPath, expect.anything());
        });

        it("should read dumps from dumpsDir as function", async () => {
            const store = createStore_({ dumpsDir: test => test.fullTitle() });

            await store.get("testUrl");

            const dumpPath = path.resolve("fullTitle", "uGDzURz0");
            expect(workersRunner.readDump).toBeCalledWith(dumpPath, expect.anything());
        });
    });

    describe("saveDump", () => {
        it("should not save empty dump", async () => {
            const store = createStore_();

            await store.saveDump({ overwrite: false });

            expect(workersRunner.writeDump).not.toBeCalled();
        });

        it("should save dump", async () => {
            const store = createStore_();
            store.set("foo", { body: "bar", headers: {}, responseCode: 200 });

            await store.saveDump({ overwrite: false });

            expect(workersRunner.writeDump).toBeCalled();
        });

        [true, false].forEach(state => {
            it(`should ${state ? "" : "not "}overwrite existing dump if "overwrite = ${state}"`, async () => {
                const store = createStore_();
                store.set("foo", { body: "bar", headers: {}, responseCode: 200 });

                await store.saveDump({ overwrite: state });

                expect(workersRunner.writeDump).toBeCalledWith(
                    expect.anything(),
                    expect.anything(),
                    expect.objectContaining({ overwrite: state }),
                );
            });

            it(`should save ${state ? "" : "not "}gzipped dumps if "gzipped = ${state}"`, async () => {
                const store = createStore_({ gzipDumps: state });
                store.set("foo", { body: "bar", headers: {}, responseCode: 200 });

                await store.saveDump({ overwrite: false });

                expect(workersRunner.writeDump).toBeCalledWith(
                    expect.anything(),
                    expect.anything(),
                    expect.objectContaining({ gzipDumps: state }),
                );
            });
        });
    });

    describe("get", () => {
        describe("should return null", () => {
            it("if dump is empty", async () => {
                workersRunner.readDump = jest.fn().mockResolvedValue({});
                const store = createStore_();

                await expect(store.get("testUrl")).resolves.toBe(null);
            });

            it("if request is not stored", async () => {
                const store = createStore_();

                await expect(store.get("notStoredUrl")).resolves.toBe(null);
            });

            it("if request with current index is not stored", async () => {
                const store = createStore_();

                await store.get("testUrl");
                await store.get("testUrl");
                await expect(store.get("testUrl")).resolves.toBe(null);
            });
        });

        it("should load dump on first call", async () => {
            const store = createStore_();

            await store.get("testUrl");

            expect(workersRunner.readDump).toBeCalled();
        });

        it("should read gzipped dumps", async () => {
            const store = createStore_({ dumpsDir: "dumps-dir", gzipDumps: true });

            await store.get("testUrl");

            const dumpPath = path.resolve("dumps-dir", "uGDzURz0");
            expect(workersRunner.readDump).toBeCalledWith(dumpPath, { gzipDumps: true });
        });

        it("should load dump only once", async () => {
            const store = createStore_();

            await store.get("testUrl");
            await store.get("testUrl");

            expect(workersRunner.readDump).toBeCalledTimes(1);
        });

        it("should resolve responses in order", async () => {
            const store = createStore_();

            await expect(store.get("testUrl")).resolves.toMatchObject({ body: "body" });
            await expect(store.get("testUrl")).resolves.toMatchObject({ body: "body2" });
        });
    });

    describe("set", () => {
        it("should create empty dump if not exist", async () => {
            const store = createStore_({ gzipDumps: false });
            const expectingDump: Dump = {
                requests: {
                    testUrl: [fResponse.hash],
                },
                responses: {
                    [fResponse.hash]: fResponse.response,
                },
            };

            store.set("testUrl", fResponse.response);

            await store.saveDump({ overwrite: false });
            expect(workersRunner.writeDump).toBeCalledWith(expect.anything(), expectingDump, {
                overwrite: false,
                gzipDumps: false,
            });
        });

        it("should set subsequent dumps", async () => {
            const store = createStore_({ gzipDumps: false });
            const expectingDump: Dump = {
                requests: {
                    testUrl: [fResponse.hash, fResponse.hash],
                },
                responses: {
                    [fResponse.hash]: fResponse.response,
                },
            };

            store.set("testUrl", fResponse.response);
            store.set("testUrl", fResponse.response);

            await store.saveDump({ overwrite: false });
            expect(workersRunner.writeDump).toBeCalledWith(expect.anything(), expectingDump, {
                overwrite: false,
                gzipDumps: false,
            });
        });
    });

    describe("currentTest", () => {
        it("should return current test", () => {
            const test = {} as Hermione.Test;
            const store = createStore_({ test });

            expect(store.currentTest).toBe(test);
        });
    });
});
