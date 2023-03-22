import fs from "fs";
import path from "path";

import type { Dump } from "../types";
import { readJsonGz, readJson, writeJsonGz, writeJson } from "./fileUtils";

type readDump = (fileName: string, opts?: { gzipDumps?: boolean }) => Promise<Dump>;
type writeDump = (fileName: string, dump: Dump, opts?: { gzipDumps?: boolean; overwrite?: boolean }) => Promise<void>;

export interface WorkersRunner {
    readDump: readDump;
    writeDump: writeDump;
}

export const readDump: readDump = async (fileName, { gzipDumps = true } = {}) => {
    return gzipDumps ? readJsonGz(fileName) : readJson(fileName);
};

const checkPathContent = async (path: string): Promise<"empty" | "file" | "directory"> => {
    return new Promise<"empty" | "file" | "directory">(resolve => {
        fs.promises
            .stat(path)
            .then(stat => resolve(stat.isDirectory() ? "directory" : "file"))
            .catch(() => resolve("empty"));
    });
};

export const writeDump: writeDump = async (fileName, dump, { gzipDumps = true, overwrite } = {}) => {
    const pathContent = await checkPathContent(fileName);

    if (pathContent === "directory") {
        throw Error(`${fileName} is directory. Please remove or rename it`);
    }

    if (pathContent === "file" && !overwrite) {
        return;
    }

    await fs.promises.mkdir(path.dirname(fileName), { recursive: true });

    return gzipDumps ? writeJsonGz(fileName, dump) : writeJson(fileName, dump);
};
