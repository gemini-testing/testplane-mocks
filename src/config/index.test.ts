import Hermione from "hermione";
import { PluginConfig, parseConfig as parseConfigOrigin } from ".";
import { DUMPS_DIR } from "../constants";
import { RunMode } from "../types";

const parseConfig = (
    pluginConfig: Record<string, unknown>,
    hermioneConfig: Record<string, unknown> = {},
): PluginConfig => parseConfigOrigin(pluginConfig as PluginConfig, hermioneConfig as unknown as Hermione.Config);

describe("config", () => {
    it("should parse default config", () => {
        expect(parseConfig({}, { baseUrl: "baseUrl" })).toMatchObject({
            enabled: true,
            hostsPatterns: ["baseUrl*"],
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

    describe("hostsPatterns", () => {
        it("should throw if it is not type of Array", () => {
            expect(() => parseConfig({ hostsPatterns: "*" })).toThrow(/must be an array of strings/);
        });

        it("should throw if each item is not type of String", () => {
            expect(() => parseConfig({ hostsPatterns: ["*", 2] })).toThrow(/[2=number]/);
        });

        it("should parse", () => {
            expect(parseConfig({ hostsPatterns: ["path"] })).toMatchObject({
                hostsPatterns: ["path"],
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
