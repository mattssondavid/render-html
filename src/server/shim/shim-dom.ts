import { JSDOM } from "npm:jsdom@26.1.0";

if (typeof self === "undefined") {
    // @ts-ignore Gurantee that `self` exist
    (globalThis as Window & typeof globalThis).self = globalThis;
}

/**
 * Patch the `self` variable
 */

const baseHTML = `<!DOCTYPE html><html><head></head><body></body></html>`;
const { window } = new JSDOM(baseHTML, { pretendToBeVisual: true });

/*
 * Patch/Polyfill `self`
 *
 * Note: The use of `self` instead of `globalThis` for non-standard JS objects
 * (e.g., `Map`) is to use DOM functionality that has been patched into `self` as
 * the global, as DOM functionality (and Web APIs) is not commonly included in
 * the Deno (or Node) run environment.
 */
const patchedDOMAPIs = [
    "CSSStyleSheet",
    "customElements",
    "document",
    "DocumentFragment",
    "DOMParser",
    "Element",
    "HTMLElement",
    "HTMLTemplateElement",
    "Node",
    "NodeFilter",
    "ShadowRoot",
];
patchedDOMAPIs.forEach((domApi: string): void => {
    Reflect.set(self, domApi, window[domApi as keyof globalThis.Window]);
});

/*
 * Patches while waiting for JSDOM to add support
 */
import("./patch/attachShadow.ts");
import("./patch/cssStyleSheetPatch.ts");
