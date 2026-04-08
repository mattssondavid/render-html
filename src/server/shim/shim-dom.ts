export async function createShimDom(
    // deno-lint-ignore no-explicit-any
    JSDOM: any,
    requiredDomAPIs?: string[]
): Promise<void> {
    if (typeof globalThis.self === 'undefined') {
        // @ts-ignore Gurantee that `self` exist
        (globalThis as Window & typeof globalThis).self = globalThis;
    }

    // @ts-ignore Require that `document` exist
    if (typeof globalThis.document !== 'undefined') {
        return;
    }

    /**
     * Patch the `self` variable
     */
    // This require to work as stand-alone import for any Deno environment,
    // so using npm-import. Dynamic import is to not import JSDOM if the shim
    // is not needed.
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
    const defaultDOMAPIs = [
        'CSSStyleSheet',
        'customElements',
        'document',
        'DocumentFragment',
        'DOMParser',
        'Element',
        'HTMLElement',
        'HTMLTemplateElement',
        'Node',
        'NodeFilter',
        'ShadowRoot',
    ];
    const patchedDOMAPIs = requiredDomAPIs
        ? [...defaultDOMAPIs, ...requiredDomAPIs]
        : defaultDOMAPIs;
    patchedDOMAPIs.forEach((domApi: string): void => {
        if (!(domApi in self)) {
            Reflect.set(
                self,
                domApi,
                window[domApi as keyof globalThis.Window]
            );
        }
    });

    /*
     * Patches while waiting for JSDOM to add support to `attachShadow`'s
     */
    await import('./patch/attachShadow.ts');
    await import('./patch/cssStyleSheetPatch.ts');
}
