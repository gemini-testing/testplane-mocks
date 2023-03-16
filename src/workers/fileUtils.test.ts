import fs from "fs";
import zlib from "zlib";
import StreamMock from "./__mocks__/streamMock";
import { readJson, readJsonGz, writeJson, writeJsonGz } from "./fileUtils";

interface FsMock {
    createReadStream: jest.Mock;
    createWriteStream: jest.Mock;
    promises: {
        readFile: jest.Mock;
        writeFile: jest.Mock;
    };
}

interface ZlibMock {
    createGzip: jest.Mock;
    createGunzip: jest.Mock;
}

jest.mock("fs", () => ({
    createReadStream: jest.fn(),
    createWriteStream: jest.fn(),
    promises: {
        readFile: jest.fn().mockResolvedValue("{}"),
        writeFile: jest.fn().mockReturnValue(Promise.resolve()),
    },
}));

jest.mock("zlib", () => ({
    createGzip: jest.fn(),
    createGunzip: jest.fn(),
}));

describe("workers/fileUtils", () => {
    const mockedFs = fs as unknown as FsMock;
    const mockedZlib = zlib as unknown as ZlibMock;

    let readStreamMock: StreamMock;
    let writeStreamMock: StreamMock;
    let gunzipMock: StreamMock;
    let gzipMock: StreamMock;
    let readPipeMock: StreamMock;
    let writePipeMock: StreamMock;

    beforeEach(() => {
        readStreamMock = new StreamMock();
        writeStreamMock = new StreamMock();
        gunzipMock = new StreamMock();
        gzipMock = new StreamMock();
        readPipeMock = new StreamMock();
        writePipeMock = new StreamMock();

        mockedFs.createReadStream.mockReturnValue(readStreamMock);
        mockedFs.createWriteStream.mockReturnValue(writeStreamMock);

        mockedZlib.createGunzip.mockReturnValue(gunzipMock);
        mockedZlib.createGzip.mockReturnValue(gzipMock);

        readStreamMock.pipe.mockReturnValue(readPipeMock);
        gzipMock.pipe.mockReturnValue(writePipeMock);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

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
            const dumpJson = JSON.stringify(dump, null, 2);

            await writeJson("fileName", dump);

            expect(mockedFs.promises.writeFile).toBeCalledWith("fileName.json", dumpJson, { encoding: "utf8" });
        });
    });

    describe("readJsonGz", () => {
        it("should pipe read -> decompress", async () => {
            readPipeMock.setPendingEvents([{ name: "data", args: [Buffer.from("{}")] }, { name: "end" }]);

            await readJsonGz("fileName");

            expect(readStreamMock.pipe).toBeCalledWith(gunzipMock);
        });

        it("should create read stream with .json.gz extension", async () => {
            readPipeMock.setPendingEvents([{ name: "data", args: [Buffer.from("{}")] }, { name: "end" }]);

            await readJsonGz("fileName");

            expect(mockedFs.createReadStream).toBeCalledWith("fileName.json.gz");
        });

        it("should concatenate chunks", async () => {
            readPipeMock.setPendingEvents([
                { name: "data", args: [Buffer.from('{"requests": {}, ')] },
                { name: "data", args: [Buffer.from('"responses": {}}')] },
                { name: "end" },
            ]);

            const dump = await readJsonGz("fileName");

            expect(dump).toEqual({ requests: {}, responses: {} });
        });

        it("should reject if an error occured during reading a file", async () => {
            readStreamMock.setPendingEvents([{ name: "error", args: ["foo"] }]);

            await expect(() => readJsonGz("fileName")).rejects.toEqual("foo");
        });

        it("should reject if an error occured during decompressing a file", async () => {
            gunzipMock.setPendingEvents([{ name: "error", args: ["bar"] }]);

            await expect(() => readJsonGz("fileName")).rejects.toEqual("bar");
        });
    });

    describe("writeJsonGz", () => {
        it("should create write stream with .json.gz extension", async () => {
            writeStreamMock.setPendingEvents([{ name: "finish" }]);

            await writeJsonGz("fileName", { requests: {}, responses: {} });

            expect(mockedFs.createWriteStream).toBeCalledWith("fileName.json.gz");
        });

        it("should pipe compress -> write", async () => {
            writeStreamMock.setPendingEvents([{ name: "finish" }]);

            await writeJsonGz("fileName", { requests: {}, responses: {} });

            expect(gzipMock.pipe).toBeCalledWith(writeStreamMock);
        });

        it("should write passed dump", async () => {
            writeStreamMock.setPendingEvents([{ name: "finish" }]);
            const dump = { requests: {}, responses: {} };
            const jsonDump = JSON.stringify(dump);
            const buffer = Buffer.from(jsonDump);

            await writeJsonGz("fileName", { requests: {}, responses: {} });

            expect(gzipMock.end).toBeCalledWith(buffer);
        });

        it("should reject if an error occured during writing a file", async () => {
            writeStreamMock.setPendingEvents([{ name: "error", args: ["foo"] }]);

            await expect(() =>
                writeJsonGz("fileName", {
                    requests: {},
                    responses: {},
                }),
            ).rejects.toEqual("foo");
        });
    });
});
