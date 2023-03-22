import _ from "lodash";
import { root, section } from "gemini-configparser";

import {
    arrayStringOption,
    dumpsDirOption,
    booleanOption,
    runModeOption,
    mocksPatternsOption,
    dumpsKeyOption,
} from "./utils";
import { DUMPS_DIR } from "../constants";
import { MocksPattern, RunMode } from "../types";

export type PluginConfig = {
    enabled: boolean;
    patterns: MocksPattern[];
    browsers: string[];
    mode: RunMode;
    dumpsDir: string | ((test: Hermione.Test) => string);
    dumpsKey: (requestUrl: string) => string;
    gzipDumps: boolean;
};

export function parseConfig(options: PluginConfig): PluginConfig {
    const { env, argv } = process;
    const parseOptions = root<PluginConfig>(
        section({
            enabled: booleanOption("enabled", true),
            patterns: mocksPatternsOption("patterns", []),
            browsers: arrayStringOption("browsers", []),
            mode: runModeOption("mode", RunMode.Play),
            dumpsDir: dumpsDirOption("dumpsDir", DUMPS_DIR),
            dumpsKey: dumpsKeyOption("dumpsKey", _.identity),
            gzipDumps: booleanOption("gzipDumps", true),
        }),
        {
            envPrefix: "hermione_mocks_",
            cliPrefix: "--mocks-",
        },
    );

    return parseOptions({ options, env, argv });
}
