export async function createShimDom(): Promise<void> {
    if (typeof globalThis.self === 'undefined') {
        // @ts-ignore Gurantee that `self` exist
        (globalThis as Window & typeof globalThis).self = globalThis;
    }

    if (typeof globalThis.document !== 'undefined') {
        return;
    }

    /**
     * Patch the `self` variable
     */
    // This require to work as stand-alone import for any Deno environment,
    // so using npm-import. Dynamic import is to not import JSDOM if the shim
    // is not needed.
    // deno-lint-ignore no-import-prefix
    const module = await import('npm:jsdom@28.0.0');
    const { JSDOM } = module.default || module;
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
