export const css = (strings, ...substitutions) => {
    const content = String.raw({ raw: strings }, ...substitutions);
    const sheet = new self.CSSStyleSheet();
    sheet.replaceSync(content);
    return sheet;
};
