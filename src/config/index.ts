import { root, section } from "gemini-configparser";

import { arrayStringOption, stringOrFunctionOption, booleanOption, runModeOption, mocksPatternsOption } from "./utils";
import { DUMPS_DIR } from "../constants";
import { MocksPattern, RunMode } from "../types";

export type PluginConfig = {
    enabled: boolean;
    patterns: MocksPattern[];
    browsers: string[];
    mode: RunMode;
    dumpsDir: string | ((test: Hermione.Test) => string);
};

export function parseConfig(options: PluginConfig): PluginConfig {
    const { env, argv } = process;
    const parseOptions = root<PluginConfig>(
        section({
            enabled: booleanOption("enabled", true),
            patterns: mocksPatternsOption("patterns", []),
            browsers: arrayStringOption("browsers", []),
            mode: runModeOption("mode", RunMode.Play),
            dumpsDir: stringOrFunctionOption("dumpsDir", DUMPS_DIR),
        }),
        {
            envPrefix: "hermione_mocks_",
            cliPrefix: "--mocks-",
        },
    );

    return parseOptions({ options, env, argv });
}
