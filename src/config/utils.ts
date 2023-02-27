import { option, Parser } from "gemini-configparser";
import _ from "lodash";

import { RunMode } from "../types";

const isStringOrFunction = (val: unknown): boolean => _.isString(val) || _.isFunction(val);
const isRunModeOption = (val: unknown): boolean => Object.values(RunMode).includes(val as RunMode);
const isStringArray = (val: unknown): boolean => _.isArray(val) && val.every(_.isString);

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
