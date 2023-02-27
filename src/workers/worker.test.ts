import type { Dump } from "../types";
import { readDump, writeDump } from "./worker";

jest.mock("fs", () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        stat: jest.fn(),
        mkdir: jest.fn(),
    },
}));

import fs from "fs";

describe("workers/worker", () => {
    interface fsMock {
        promises: {
            readFile: jest.Mock;
            writeFile: jest.Mock;
            stat: jest.Mock;
            mkdir: jest.Mock;
        };
    }
    const mockedFs = fs as unknown as fsMock;
    describe("readDump", () => {
        beforeEach(() => {
            mockedFs.promises.readFile.mockResolvedValue(JSON.stringify({ foo: "bar" }));
        });

        it("should read dump from file system", async () => {
            await readDump("fileName");

            expect(mockedFs.promises.readFile).toBeCalledWith("fileName", { encoding: "utf8" });
        });

        it("should resolve parsed object", async () => {
            expect(readDump("fileName")).resolves.toEqual({ foo: "bar" });
        });
    });

    describe("writeDump", () => {
        const writeDump_ = (opts: { fileName?: string; dump?: Dump; overwrite?: boolean } = {}): Promise<void> => {
            opts.fileName ||= "fileName";
            opts.dump ||= { requests: {}, responses: {} };
            opts.overwrite ||= false;

            return writeDump(opts.fileName, opts.dump, opts.overwrite);
        };

        it("should throw error if path contains directory", () => {
            mockedFs.promises.stat.mockResolvedValue({ isDirectory: () => true });

            expect(writeDump_).rejects.toThrow(/is directory/);
        });

        it("should not overwrite existing dump, if overwrite is not set", async () => {
            mockedFs.promises.stat.mockResolvedValue({ isDirectory: () => false });

            await writeDump_({ overwrite: false });

            expect(mockedFs.promises.writeFile).not.toBeCalled();
        });

        it("should overwrite existing dump, if overwrite is set", async () => {
            mockedFs.promises.stat.mockResolvedValue({ isDirectory: () => false });

            await writeDump_({ overwrite: true });

            expect(mockedFs.promises.writeFile).toBeCalledWith(
                "fileName",
                JSON.stringify({ requests: {}, responses: {} }, null, 2),
            );
        });

        it("should save dump, if it does not exist", async () => {
            mockedFs.promises.stat.mockRejectedValue("no such file or directory");

            await writeDump_({ overwrite: false });

            expect(mockedFs.promises.writeFile).toBeCalledWith(
                "fileName",
                JSON.stringify({ requests: {}, responses: {} }, null, 2),
            );
        });

        it("should create dump directory", async () => {
            mockedFs.promises.stat.mockRejectedValue("no such file or directory");

            await writeDump_({ fileName: "dir1/dir2/fileName" });

            expect(mockedFs.promises.mkdir).toBeCalledWith("dir1/dir2", { recursive: true });
        });
    });
});
