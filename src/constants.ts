import type { SupportedResourceType } from "./types";

export const DUMPS_DIR = "testplane-dumps";
export const TARGET_PAGE = "page";
export const TEST_MOCKS_ERROR = Symbol("mocks_error");
export const SUPPORTED_RESOURCE_TYPES: SupportedResourceType[] = [
    "Document",
    "Stylesheet",
    "Image",
    "Media",
    "Script",
    "XHR",
    "Fetch",
];
export enum DUMP_EXTENSIONS {
    json = ".json",
    jsonGz = ".json.gz",
}
