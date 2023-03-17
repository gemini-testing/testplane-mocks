import fs from "fs";
import zlib from "zlib";
import { readJson, readJsonGz, writeJson, writeJsonGz } from "./fileUtils";

interface FsMock {
    promises: {
        readFile: jest.Mock;
        writeFile: jest.Mock;
    };
}

interface ZlibMock {
    gzip: jest.Mock;
    unzip: jest.Mock;
}

jest.mock("fs", () => ({
    promises: {
        writeFile: jest.fn().mockReturnValue(Promise.resolve()),
        readFile: jest.fn().mockImplementation((_, opts = {}) => {
            const result = opts.encoding === "utf8" ? "{}" : Buffer.from("{}");

            return Promise.resolve(result);
        }),
    },
}));

jest.mock("zlib", () => ({
    gzip: jest.fn().mockImplementation((content, callback) => callback(null, content)),
    unzip: jest.fn().mockImplementation((content, callback) => callback(null, content)),
}));

describe("workers/fileUtils", () => {
    const mockedFs = fs as unknown as FsMock;
    const mockedZlib = zlib as unknown as ZlibMock;

    afterEach(() => {
        jest.clearAllMocks();
    });

    function mockZlibResolve_(fnName: "gzip" | "unzip", value: string | Buffer): void {
        mockedZlib[fnName].mockImplementationOnce((_, callback) => callback(null, value));
    }

    function mockZlibReject_(fnName: "gzip" | "unzip", error: Error): void {
        mockedZlib[fnName].mockImplementationOnce((_, callback) => callback(error));
    }

    describe("readJson", () => {
        it("should read file with .json extension", async () => {
            await readJson("fileName");

            expect(mockedFs.promises.readFile).toBeCalledWith("fileName.json", { encoding: "utf8" });
        });

        it("should resolve file content", async () => {
            mockedFs.promises.readFile.mockResolvedValue('{"foo": "bar"}');

            const dump = await readJson("fileName");

            expect(mockedFs.promises.readFile).toBeCalledWith("fileName.json", { encoding: "utf8" });
            expect(dump).toEqual({ foo: "bar" });
        });
    });

    describe("writeJson", () => {
        it("should write file with .json extension", async () => {
            await writeJson("fileName", { requests: {}, responses: {} });

            expect(mockedFs.promises.writeFile).toBeCalledWith("fileName.json", expect.anything(), expect.anything());
        });

        it("should write file content", async () => {
            const dump = { requests: {}, responses: {} };
            const dumpJson = JSON.stringify(dump, null, 4);

            await writeJson("fileName", dump);

            expect(mockedFs.promises.writeFile).toBeCalledWith("fileName.json", dumpJson, { encoding: "utf8" });
        });
    });

    describe("readJsonGz", () => {
        it("should read file with .json.gz extension", async () => {
            await readJsonGz("fileName");

            expect(mockedFs.promises.readFile).toBeCalledWith("fileName.json.gz");
        });

        it("should decompress content", async () => {
            mockedFs.promises.readFile.mockResolvedValueOnce("compressed-data");
            mockZlibResolve_("unzip", Buffer.from('{"foo": "bar"}'));

            const dump = await readJsonGz("fileName");

            expect(mockedZlib.unzip).toBeCalledWith("compressed-data", expect.any(Function));
            expect(dump).toEqual({ foo: "bar" });
        });

        it("should reject if an error occured during reading a file", async () => {
            mockedFs.promises.readFile.mockRejectedValueOnce(Error("foo"));

            await expect(() => readJsonGz("fileName")).rejects.toEqual(Error("foo"));
        });

        it("should reject if an error occured during decompressing a file", async () => {
            mockZlibReject_("unzip", Error("bar"));

            await expect(() => readJsonGz("fileName")).rejects.toEqual(Error("bar"));
        });
    });

    describe("writeJsonGz", () => {
        it("should write file with .json.gz extension", async () => {
            await writeJsonGz("fileName", { requests: {}, responses: {} });

            expect(mockedFs.promises.writeFile).toBeCalledWith("fileName.json.gz", expect.any(Buffer));
        });

        it("should compress content", async () => {
            mockZlibResolve_("gzip", "compressed-data");

            await writeJsonGz("fileName", { requests: {}, responses: {} });

            expect(mockedFs.promises.writeFile).toBeCalledWith(expect.any(String), "compressed-data");
        });

        it("should reject if an error occured during writing a file", async () => {
            mockedFs.promises.writeFile.mockRejectedValueOnce("foo");

            await expect(() =>
                writeJsonGz("fileName", {
                    requests: {},
                    responses: {},
                }),
            ).rejects.toEqual("foo");
        });
    });
});
