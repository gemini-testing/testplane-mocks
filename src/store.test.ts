import path from "path";
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
    }) => Store;

    const createStore_: createStore = (opts = {}) => {
        opts.dumpsDir ||= "dumps-dir";
        opts.workersRunner ||= workersRunner;
        opts.test ||= test;

        return Store.create(opts.dumpsDir, opts.workersRunner, opts.test);
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

            const dumpPath = path.resolve(process.cwd(), "specified", "uGDzURz0") + ".json";
            expect(workersRunner.readDump).toBeCalledWith(dumpPath);
        });

        it("should read dumps from dumpsDir as function", async () => {
            const store = createStore_({ dumpsDir: test => test.fullTitle() });

            await store.get("testUrl");

            const dumpPath = path.resolve("fullTitle", "uGDzURz0") + ".json";
            expect(workersRunner.readDump).toBeCalledWith(dumpPath);
        });
    });

    describe("saveDump", () => {
        it("should save dump", async () => {
            const store = createStore_();

            await store.saveDump({ overwrite: false });

            expect(workersRunner.writeDump).toBeCalled();
        });

        it("should overwrite existing dump if overwrite is set", async () => {
            const store = createStore_();

            await store.saveDump({ overwrite: true });

            expect(workersRunner.writeDump).toBeCalledWith(expect.anything(), undefined, true);
        });

        it("should not overwrite existing dump if overwrite is not set", async () => {
            const store = createStore_();

            await store.saveDump({ overwrite: false });

            expect(workersRunner.writeDump).toBeCalledWith(expect.anything(), undefined, false);
        });
    });

    describe("get", () => {
        it("should load dump on first call", async () => {
            const store = createStore_();

            await store.get("testUrl");

            expect(workersRunner.readDump).toBeCalled();
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
            const store = createStore_();
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
            expect(workersRunner.writeDump).toBeCalledWith(expect.anything(), expectingDump, false);
        });

        it("should set subsequent dumps", async () => {
            const store = createStore_();
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
            expect(workersRunner.writeDump).toBeCalledWith(expect.anything(), expectingDump, false);
        });
    });
});
