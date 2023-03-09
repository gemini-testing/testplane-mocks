import { PluginConfig, parseConfig as parseConfigOrigin } from ".";
import { DUMPS_DIR } from "../constants";
import { RunMode } from "../types";

const parseConfig = (pluginConfig: Record<string, unknown>): PluginConfig =>
    parseConfigOrigin(pluginConfig as PluginConfig);

describe("config", () => {
    it("should parse default config", () => {
        expect(parseConfig({})).toMatchObject({
            enabled: true,
            patterns: [],
            browsers: [],
            mode: RunMode.Play,
            dumpsDir: DUMPS_DIR,
        });
    });

    describe("enabled", () => {
        it("should throw if it is not type of Boolean", () => {
            expect(() => parseConfig({ enabled: "asd" })).toThrow(/must be a boolean/);
        });

        it("should parse option", () => {
            expect(parseConfig({ enabled: true })).toMatchObject({
                enabled: true,
            });
        });
    });

    describe("patterns", () => {
        describe("should throw", () => {
            it("if it is not type of Array", () => {
                expect(() => parseConfig({ patterns: 2 })).toThrow(/must be an array of objects/);
            });

            it("if each item is not type of MocksPattern", () => {
                expect(() => parseConfig({ patterns: [2] })).toThrow(/must be an object/);
            });

            it("if item 'urlPattern' is not a string", () => {
                expect(() => parseConfig({ patterns: [{ url: 2, resources: "*" }] })).toThrow(/must be a string/);
            });

            describe("if item 'resource'", () => {
                it("is not an '*' or array", () => {
                    expect(() => parseConfig({ patterns: [{ url: "", resources: 2 }] })).toThrow(
                        /must be a '\*' or array/,
                    );
                });

                it("is array and it has not a string values", () => {
                    expect(() => parseConfig({ patterns: [{ url: "", resources: [2] }] })).toThrow(
                        /must be a '\*' or array/,
                    );
                });

                it("is array and it has non-resource values", () => {
                    expect(() => parseConfig({ patterns: [{ url: "", resources: ["foo"] }] })).toThrow(
                        /is not a valid resource/,
                    );
                });
            });
        });

        describe("should parse", () => {
            it("if resources is array of types", () => {
                expect(parseConfig({ patterns: [{ url: "*", resources: ["Document"] }] })).toMatchObject({
                    patterns: [{ url: "*", resources: ["Document"] }],
                });
            });

            it("if resources is '*'", () => {
                expect(parseConfig({ patterns: [{ url: "*", resources: "*" }] })).toMatchObject({
                    patterns: [{ url: "*", resources: "*" }],
                });
            });
        });
    });

    describe("browsers", () => {
        it("should throw if it is not type of Array", () => {
            expect(() => parseConfig({ browsers: "chrome" })).toThrow(/must be an array of strings/);
        });

        it("should throw if each item is not type of string", () => {
            expect(() => parseConfig({ browsers: [/ff/, "chrome"] })).toThrow(/must be an array of strings/);
        });

        it("should parse", () => {
            expect(parseConfig({ browsers: ["chrome", "chrome-headless"] })).toMatchObject({
                browsers: ["chrome", "chrome-headless"],
            });
        });
    });

    describe("mode", () => {
        it("should throw if it is not enum of RunMode", () => {
            expect(() => parseConfig({ mode: "asd" })).toThrow(/must be a "play" or "save" or "create"/);
        });

        it("should parse 'play'", () => {
            expect(parseConfig({ mode: RunMode.Play })).toMatchObject({
                mode: RunMode.Play,
            });
        });

        it("should parse 'create'", () => {
            expect(parseConfig({ mode: RunMode.Create })).toMatchObject({
                mode: RunMode.Create,
            });
        });
    });

    describe("dumpsDir", () => {
        it("should throw if it is not type of String or Function", () => {
            expect(() => parseConfig({ dumpsDir: 2 })).toThrow(/string/);
        });

        it("should parse", () => {
            expect(parseConfig({ dumpsDir: "file.path" })).toMatchObject({
                dumpsDir: "file.path",
            });
        });
    });
});
