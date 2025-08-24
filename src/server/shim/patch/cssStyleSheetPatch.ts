declare global {
    interface CSSStyleSheet {
        replaceSync(cssText: string): void;
    }
}

/**
 * Monkey Patch `CSSStyleSheet.replaceSync` when needed while waiting for JSDOM
 * to add support.
 */
if (!('replaceSync' in CSSStyleSheet.prototype)) {
    const proto: CSSStyleSheet = CSSStyleSheet.prototype;
    proto.replaceSync = function (cssText: string): void {
        while (this.cssRules.length > 0) {
            this.deleteRule(0);
        }

        const style = document.createElement('style');
        style.textContent = cssText;
        document.head.appendChild(style);
        const tempSheet = style.sheet as CSSStyleSheet;

        try {
            for (let index = 0; index < tempSheet.cssRules.length; index++) {
                this.insertRule(
                    tempSheet.cssRules[index].cssText,
                    this.cssRules.length
                );
            }
        } finally {
            style.remove();
        }
    };
}
