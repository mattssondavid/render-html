if (!('replaceSync' in self.CSSStyleSheet.prototype)) {
    const proto = self.CSSStyleSheet.prototype;
    proto.replaceSync = function (cssText) {
        while (this.cssRules.length > 0) {
            this.deleteRule(0);
        }
        const style = self.document.createElement('style');
        style.textContent = cssText;
        self.document.head.appendChild(style);
        const tempSheet = style.sheet;
        try {
            for (let index = 0; index < tempSheet.cssRules.length; index++) {
                this.insertRule(tempSheet.cssRules[index].cssText, this.cssRules.length);
            }
        }
        finally {
            style.remove();
        }
    };
}
export {};
