import { createShimDom as shim } from './src/server/shim/shim-dom.ts';

// @ts-ignore Deno global is not available in Node/tsc for node
const isDeno = typeof Deno !== 'undefined';

const { JSDOM } = isDeno
    ? // @ts-ignore npm: specifier is not recognized by tsc for node support
      await import('npm:jsdom@28.0.0')
    : await import('jsdom');

/**
 * Create a DOM SHIM
 *
 * @param {string[]} [requiredDomAPIs] Additional DOM/Web APIs to patch
 * @returns {Promise<void>}
 */
export function createShimDom(requiredDomAPIs?: string[]): Promise<void> {
    return shim(JSDOM, requiredDomAPIs);
}
