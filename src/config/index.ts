import { root, section } from "gemini-configparser";

import { arrayStringOption, stringOrFunctionOption, booleanOption, runModeOption } from "./utils";
import { DUMPS_DIR } from "../constants";
import { RunMode } from "../types";

export type PluginConfig = {
    enabled: boolean;
    hostsPatterns: string[];
    browsers: string[];
    mode: RunMode;
    dumpsDir: string | ((test: Hermione.Test) => string);
};

export function parseConfig(options: PluginConfig, hermioneConfig: Hermione.Config): PluginConfig {
    const { env, argv } = process;
    const parseOptions = root<PluginConfig>(
        section({
            enabled: booleanOption("enabled", true),
            hostsPatterns: arrayStringOption("hostsPatterns", [hermioneConfig.baseUrl + "*"]),
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
