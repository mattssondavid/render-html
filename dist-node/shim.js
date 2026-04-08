import { createShimDom as shim } from "./src/server/shim/shim-dom.js";
const isDeno = typeof Deno !== 'undefined';
const { JSDOM } = isDeno
    ?
        await import('npm:jsdom@28.0.0')
    : await import('jsdom');
export function createShimDom(requiredDomAPIs) {
    return shim(JSDOM, requiredDomAPIs);
}
