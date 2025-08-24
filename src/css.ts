if (typeof Document === 'undefined') {
    await import('./server/shim/shim-dom.ts');
}

/**
 * Parse the tagged template strings and creates a CSSStyleSheet with the valid
 * CSS in the template string as part of the new stylesheet's CSSRuleList.
 *
 * @param {TemplateStringsArray} strings - The CSS strings to parse
 * @param {unknown[]} substitutions  - The substitutions
 * @returns {CSSStyleSheet} The created CSSStyleSheet
 */
export const css = (
    strings: TemplateStringsArray,
    ...substitutions: unknown[]
): CSSStyleSheet => {
    const content = String.raw({ raw: strings }, ...substitutions);
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(content);
    return sheet;
};
