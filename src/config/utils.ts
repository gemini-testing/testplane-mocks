import { option, Parser } from "gemini-configparser";
import _ from "lodash";

import { SUPPORTED_RESOURCE_TYPES } from "../constants";
import { RunMode, MocksPattern } from "../types";

const isStringOrFunction = (val: unknown): boolean => _.isString(val) || _.isFunction(val);
const isRunModeOption = (val: unknown): boolean => Object.values(RunMode).includes(val as RunMode);
const isStringArray = (val: unknown): boolean => _.isArray(val) && val.every(_.isString);
const isMocksPatternObject = (val: unknown): boolean => {
    if (!_.isPlainObject(val)) {
        throw new TypeError(`patterns item must be an object, but got ${typeof val}`);
    }

    const pattern = val as MocksPattern;

    if (!_.isString(pattern.url)) {
        throw new TypeError(`patterns[].url must be a string, but got ${typeof pattern.url}`);
    }

    if (pattern.resources === "*") {
        return true;
    }

    if (!_.isArray(pattern.resources) || !pattern.resources.every(_.isString)) {
        throw new TypeError(
            `patterns[].resources must be a '*' or array of strings, but got ${typeof pattern.resources}`,
        );
    }

    pattern.resources.forEach(resource => {
        if (!SUPPORTED_RESOURCE_TYPES.includes(resource)) {
            const availableResourceTypes = SUPPORTED_RESOURCE_TYPES.map(type => `"${type}"`).join(" ");

            throw new TypeError(`${resource} is not a valid resource. Available options: [${availableResourceTypes}]`);
        }
    });

    return true;
};
const isPatternsOption = (val: unknown): boolean => _.isArray(val) && val.every(isMocksPatternObject);

const assertType = <T>(name: string, validationFn: (v: unknown) => boolean, type: string) => {
    return (v: T) => {
        if (!validationFn(v)) {
            const article = type.startsWith("a") ? "an" : "a";

            throw new TypeError(`${name} must be ${article} ${type}, but got ${typeof v}`);
        }
    };
};

export const booleanOption = (name: string, defaultValue: boolean): Parser<boolean> =>
    option<boolean>({
        parseEnv: JSON.parse,
        parseCli: JSON.parse,
        defaultValue,
        validate: assertType<boolean>(name, _.isBoolean, "boolean"),
    });

export const stringOrFunctionOption = (
    name: string,
    defaultValue: string | ((test: Hermione.Test) => string),
): Parser<string | ((test: Hermione.Test) => string)> =>
    option<string | ((test: Hermione.Test) => string)>({
        parseEnv: JSON.parse,
        parseCli: JSON.parse,
        defaultValue,
        validate: assertType<string | ((test: Hermione.Test) => string)>(
            name,
            isStringOrFunction, // eslint-disable-line indent
            "string or Function", // eslint-disable-line indent
        ),
    });

const validateRunMode = (name: string): ((v: string) => void) => {
    const validTypes = Object.values(RunMode)
        .map(val => `"${val}"`)
        .join(" or ");
    return assertType<string>(name, isRunModeOption, validTypes);
};

export const runModeOption = (name: string, defaultValue?: RunMode): Parser<RunMode> =>
    option<RunMode>({
        defaultValue,
        validate: validateRunMode(name),
    });

export function arrayStringOption(name: string, defaultValue: string[]): Parser<string[]> {
    return option<string[]>({
        parseEnv: JSON.parse,
        parseCli: JSON.parse,
        defaultValue,
        validate: assertType<string[]>(name, isStringArray, "array of strings"),
    });
}

export function mocksPatternsOption(name: string, defaultValue: MocksPattern[]): Parser<MocksPattern[]> {
    return option<MocksPattern[]>({
        parseEnv: JSON.parse,
        parseCli: JSON.parse,
        defaultValue,
        validate: assertType<MocksPattern[]>(name, isPatternsOption, "array of objects"),
    });
}
