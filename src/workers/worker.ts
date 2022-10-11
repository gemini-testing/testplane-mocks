import fs from "fs";
import path from "path";

import type { Dump } from "../types";

type readDump = (fileName: string) => Promise<Dump>;
type writeDump = (fileName: string, dump: Dump, overwrite: boolean) => Promise<void>;

export interface WorkersRunner {
    readDump: readDump;
    writeDump: writeDump;
}

export const readDump: readDump = async fileName => {
    return fs.promises.readFile(fileName, { encoding: "utf8" }).then(JSON.parse);
};

const checkPathContent = async (path: string): Promise<"empty" | "file" | "directory"> => {
    return new Promise<"empty" | "file" | "directory">(resolve => {
        fs.promises
            .stat(path)
            .then(stat => resolve(stat.isDirectory() ? "directory" : "file"))
            .catch(() => resolve("empty"));
    });
};

export const writeDump: writeDump = async (fileName, dump, overwrite) => {
    const pathContent = await checkPathContent(fileName);

    if (pathContent === "directory") {
        throw Error(`${fileName} is directory. Please remove or rename it`);
    }

    if (pathContent === "file" && !overwrite) {
        return;
    }

    await fs.promises.mkdir(path.dirname(fileName), { recursive: true });
    return fs.promises.writeFile(fileName, JSON.stringify(dump, null, 2));
};
