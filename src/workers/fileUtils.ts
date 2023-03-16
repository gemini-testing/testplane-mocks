import fs from "fs";
import zlib from "zlib";

import type { Dump } from "../types";
import { DUMP_EXTENSIONS } from "../constants";

type readJson = (fileName: string) => Promise<Dump>;
type readJsonGz = (fileName: string) => Promise<Dump>;
type writeJson = (fileName: string, dump: Dump) => Promise<void>;
type writeJsonGz = (fileName: string, dump: Dump) => Promise<void>;

export const readJson: readJson = fileName => {
    const jsonFileName = fileName + DUMP_EXTENSIONS.json;

    return fs.promises.readFile(jsonFileName, { encoding: "utf8" }).then(JSON.parse);
};

export const readJsonGz: readJsonGz = fileName =>
    new Promise((resolve, reject) => {
        const jsonFileName = fileName + DUMP_EXTENSIONS.jsonGz;

        const read = fs.createReadStream(jsonFileName);
        const decompress = zlib.createGunzip();
        const readDecompressed = read.pipe(decompress);

        const chunks: Array<Buffer> = [];

        readDecompressed.on("data", (chunk: Buffer) => chunks.push(chunk));
        readDecompressed.on("end", () => {
            const fileData = Buffer.concat(chunks).toString("utf8");

            resolve(JSON.parse(fileData));
        });

        read.on("error", reject);
        decompress.on("error", reject);
    });

export const writeJson: writeJson = (fileName, dump) => {
    const jsonFileName = fileName + DUMP_EXTENSIONS.json;
    const data = JSON.stringify(dump, null, 2);

    return fs.promises.writeFile(jsonFileName, data, { encoding: "utf8" });
};

export const writeJsonGz: writeJsonGz = (fileName, dump) =>
    new Promise((resolve, reject) => {
        const jsonFileName = fileName + DUMP_EXTENSIONS.jsonGz;
        const data = Buffer.from(JSON.stringify(dump));

        const compress = zlib.createGzip();
        const write = fs.createWriteStream(jsonFileName);

        compress.pipe(write);
        compress.end(data);

        write.on("finish", resolve);
        write.on("error", reject);
    });

export default { readJson, readJsonGz, writeJson, writeJsonGz };
