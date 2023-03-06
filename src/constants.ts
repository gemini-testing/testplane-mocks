import type { Protocol } from "puppeteer-core";

export const DUMPS_DIR = "hermione-dumps";
export const TARGET_PAGE = "page";
export const TEST_MOCKS_ERROR = Symbol("mocks_error");
export const SUPPORTED_RESOURCE_TYPES: Protocol.Network.ResourceType[] = [
    "Document",
    "Stylesheet",
    "Image",
    "Media",
    "Script",
    "XHR",
    "Fetch",
];
