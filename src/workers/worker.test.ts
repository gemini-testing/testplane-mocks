import fs from "fs";
import type { Dump } from "../types";
import { readDump, writeDump } from "./worker";
import fileUtils from "./fileUtils";

interface FsMock {
    promises: {
        stat: jest.Mock;
        mkdir: jest.Mock;
    };
}

interface FileUtilsMock {
    readJson: jest.Mock;
    readJsonGz: jest.Mock;
    writeJson: jest.Mock;
    writeJsonGz: jest.Mock;
}

jest.mock("fs", () => ({
    promises: {
        stat: jest.fn(),
        mkdir: jest.fn(),
    },
}));

jest.mock("./fileUtils", () => ({
    readJson: jest.fn(),
    readJsonGz: jest.fn(),
    writeJson: jest.fn(),
    writeJsonGz: jest.fn(),
}));

describe("workers/worker", () => {
    const mockedFs = fs as unknown as FsMock;
    const mockedFileUtils = fileUtils as unknown as FileUtilsMock;

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("readDump", () => {
        it("should read dump from file system", async () => {
            await readDump("fileName", { gzipDumps: false });

            expect(mockedFileUtils.readJson).toBeCalledWith("fileName");
        });

        it("should read compressed dump by default", async () => {
            await readDump("fileName");

            expect(mockedFileUtils.readJsonGz).toBeCalled();
        });

        it("should read gzipped dump from file system", async () => {
            await readDump("fileName", { gzipDumps: true });

            expect(mockedFileUtils.readJsonGz).toBeCalledWith("fileName");
        });

        [true, false].forEach(gzipDumps =>
            it(`should resolve parsed object with "gzipDumps: ${gzipDumps}"`, () => {
                mockedFileUtils.readJson.mockResolvedValue({ foo: "bar" });
                mockedFileUtils.readJsonGz.mockResolvedValue({ foo: "bar" });

                expect(readDump("fileName", { gzipDumps })).resolves.toEqual({ foo: "bar" });
            }),
        );
    });

    describe("writeDump", () => {
        const writeDump_ = (
            opts: { fileName?: string; dump?: Dump; overwrite?: boolean; gzipDumps?: boolean } = {},
        ): Promise<void> => {
            opts.fileName ||= "fileName";
            opts.dump ||= { requests: {}, responses: {} };

            return writeDump(opts.fileName, opts.dump, { overwrite: opts.overwrite, gzipDumps: opts.gzipDumps });
        };

        it("should create dump directory", async () => {
            mockedFs.promises.stat.mockRejectedValue("no such file or directory");

            await writeDump_({ fileName: "dir1/dir2/fileName" });

            expect(mockedFs.promises.mkdir).toBeCalledWith("dir1/dir2", { recursive: true });
        });

        it("should write compressed dump by default", async () => {
            await writeDump_({ fileName: "fileName" });

            expect(mockedFileUtils.writeJsonGz).toBeCalled();
        });

        it("should not overwrite dumps by default", async () => {
            mockedFs.promises.stat.mockResolvedValue({ isDirectory: () => false });

            await writeDump_({ fileName: "fileName" });

            expect(mockedFileUtils.writeJsonGz).not.toBeCalled();
        });

        it("should throw error if path contains directory", () => {
            mockedFs.promises.stat.mockResolvedValue({ isDirectory: () => true });

            expect(writeDump_).rejects.toThrow(/is directory/);
        });

        [
            { overwrite: false, gzipDumps: false, fn: mockedFileUtils.writeJson },
            { overwrite: false, gzipDumps: true, fn: mockedFileUtils.writeJsonGz },
            { overwrite: true, gzipDumps: false, fn: mockedFileUtils.writeJson },
            { overwrite: true, gzipDumps: true, fn: mockedFileUtils.writeJsonGz },
        ].forEach(({ overwrite, gzipDumps, fn }) => {
            it(`should save ${
                gzipDumps ? "gzipped " : ""
            }dump with "overwrite: ${overwrite}", if it does not exist`, async () => {
                mockedFs.promises.stat.mockRejectedValue("no such file or directory");

                await writeDump_({ overwrite: false, gzipDumps });

                expect(fn).toBeCalledWith("fileName", { requests: {}, responses: {} });
            });
        });
        [true, false].forEach(overwrite =>
            it(`should ${overwrite ? "" : "not "}overwrite existing dump, if "overwrite: ${overwrite}"`, async () => {
                mockedFs.promises.stat.mockResolvedValue({ isDirectory: () => false });

                await writeDump_({ overwrite });

                expect(mockedFileUtils.writeJsonGz).toBeCalledTimes(Number(overwrite));
            }),
        );
    });
});
