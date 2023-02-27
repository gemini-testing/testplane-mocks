import {defaults as tsjPreset} from "ts-jest/presets";

module.exports = {
    ...tsjPreset,

    verbose: true,
    globals: {
        "ts-jest": {
            tsconfig: "tsconfig.spec.json"
        }
    },
    testMatch: ["**/src/**/*.test.ts"],
    collectCoverage: true
}
