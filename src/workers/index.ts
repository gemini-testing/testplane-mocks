import type EventEmitter from "events";
import type { WorkersRunner } from "./worker";

type MapOfMethods<T extends ReadonlyArray<string>> = {
    [K in T[number]]: (...args: Array<unknown>) => Promise<unknown> | unknown;
};

type RegisterWorkers<T extends ReadonlyArray<string>> = EventEmitter & MapOfMethods<T>;

type TestplaneRunner = {
    registerWorkers: <T extends ReadonlyArray<string>>(workerFilepath: string, methods: T) => RegisterWorkers<T>;
};

export const createWorkersRunner = (runner: TestplaneRunner): WorkersRunner => {
    const workerFilepath = require.resolve("./worker");
    const methods = ["readDump", "writeDump"] as const;

    return runner.registerWorkers(workerFilepath, methods) as WorkersRunner;
};
