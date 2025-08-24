import { JSDOM } from 'npm:jsdom@26.1.0';

/**
 * Patch the `globalThis` variable
 */
const patchGlobalThis = (): void => {
    const baseHTML = `<!DOCTYPE html><html><head></head><body></body></html>`;
    const { window } = new JSDOM(baseHTML, { pretendToBeVisual: true });

    /*
     * Patch/Polyfill `globalThis`
     */
    const patchedDOMAPIs = [
        'CSSStyleSheet',
        'customElements',
        'document',
        'Document',
        'DocumentFragment',
        'DOMParser',
        'Element',
        'HTMLElement',
        'HTMLTemplateElement',
        'Node',
        'NodeFilter',
        'ShadowRoot',
        'window',
    ];
    patchedDOMAPIs.forEach((domApi: string): void => {
        Reflect.set<typeof globalThis, string>(
            globalThis,
            domApi,
            window[domApi as keyof globalThis.Window]
        );
    });

    /*
     * Patches while waiting for JSDOM to add support
     */
    import('./patch/attachShadow.ts');
    import('./patch/cssStyleSheetPatch.ts');
};
patchGlobalThis();
