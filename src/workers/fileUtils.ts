import fs from "fs";
import { gzip as gzipCallback, unzip as unzipCallback } from "zlib";
import { promisify } from "util";

import type { Dump } from "../types";
import { DUMP_EXTENSIONS } from "../constants";

type readJson = (fileName: string) => Promise<Dump>;
type readJsonGz = (fileName: string) => Promise<Dump>;
type writeJson = (fileName: string, dump: Dump) => Promise<void>;
type writeJsonGz = (fileName: string, dump: Dump) => Promise<void>;

const gzipAsync = promisify(gzipCallback);
const unzipAsync = promisify(unzipCallback);

export const readJson: readJson = async fileName => {
    const jsonFileName = fileName + DUMP_EXTENSIONS.json;

    return fs.promises.readFile(jsonFileName, { encoding: "utf8" }).then(JSON.parse);
};

export const readJsonGz: readJsonGz = async fileName => {
    const jsonFileName = fileName + DUMP_EXTENSIONS.jsonGz;

    const gzippedBuffer = await fs.promises.readFile(jsonFileName);
    const unzippedBuffer = await unzipAsync(gzippedBuffer);
    const dump = JSON.parse(unzippedBuffer.toString());

    return dump;
};

export const writeJson: writeJson = async (fileName, dump) => {
    const jsonFileName = fileName + DUMP_EXTENSIONS.json;
    const data = JSON.stringify(dump, null, 4);

    return fs.promises.writeFile(jsonFileName, data, { encoding: "utf8" });
};

export const writeJsonGz: writeJsonGz = async (fileName, dump) => {
    const jsonFileName = fileName + DUMP_EXTENSIONS.jsonGz;

    const dumpBuffer = Buffer.from(JSON.stringify(dump));
    const gzippedBuffer = await gzipAsync(dumpBuffer);

    return fs.promises.writeFile(jsonFileName, gzippedBuffer);
};

export default { readJson, readJsonGz, writeJson, writeJsonGz };
