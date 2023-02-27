import type Hermione from "hermione";
import type { WorkersRunner } from "./worker";

export const createWorkersRunner = (runner: Hermione.MainRunner): WorkersRunner => {
    const workerFilepath = require.resolve("./worker");

    return runner.registerWorkers(workerFilepath, ["readDump", "writeDump"]);
};
