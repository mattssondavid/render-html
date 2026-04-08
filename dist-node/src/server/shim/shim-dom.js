export async function createShimDom(JSDOM, requiredDomAPIs) {
    if (typeof globalThis.self === 'undefined') {
        globalThis.self = globalThis;
    }
    if (typeof globalThis.document !== 'undefined') {
        return;
    }
    const baseHTML = `<!DOCTYPE html><html><head></head><body></body></html>`;
    const { window } = new JSDOM(baseHTML, { pretendToBeVisual: true });
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
    patchedDOMAPIs.forEach((domApi) => {
        if (!(domApi in self)) {
            Reflect.set(self, domApi, window[domApi]);
        }
    });
    await import("./patch/attachShadow.js");
    await import("./patch/cssStyleSheetPatch.js");
}
