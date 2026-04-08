const originalAttachShadow = self.Element.prototype.attachShadow;
self.Element.prototype.attachShadow = function (options) {
    const shadowRoot = originalAttachShadow.apply(this, [options]);
    if (typeof shadowRoot.clonable === 'undefined') {
        shadowRoot.clonable = false;
    }
    if (typeof options.clonable === 'boolean') {
        shadowRoot.clonable = options.clonable;
    }
    if (typeof shadowRoot.delegatesFocus === 'undefined') {
        shadowRoot.delegatesFocus = false;
    }
    if (typeof options.delegatesFocus === 'boolean') {
        shadowRoot.delegatesFocus = options.delegatesFocus;
    }
    if (typeof shadowRoot.serializable === 'undefined') {
        shadowRoot.serializable = false;
    }
    if (typeof options.serializable === 'boolean') {
        shadowRoot.serializable = options.serializable;
    }
    if (typeof shadowRoot.adoptedStyleSheets === 'undefined' &&
        typeof shadowRoot.styleSheets === 'undefined') {
        Object.defineProperty(shadowRoot, 'adoptedStyleSheets', {
            get() {
                if (!this._adoptedStyleSheets) {
                    this._adoptedStyleSheets = [];
                }
                return this._adoptedStyleSheets;
            },
            set(sheets) {
                if (!Array.isArray(sheets)) {
                    throw new TypeError('adoptedStyleSheets must be an Array of CSSStyleSheet');
                }
                this._adoptedStyleSheets = sheets;
            },
            configurable: true,
            enumerable: true,
        });
        Object.defineProperty(shadowRoot, 'styleSheets', {
            get() {
                const styleSheetTags = Array.from(shadowRoot.querySelectorAll('style'))
                    .map((style) => style.sheet)
                    .filter((sheet) => sheet !== null);
                const styleSheets = [...styleSheetTags];
                return {
                    length: styleSheets.length,
                    item(index) {
                        return styleSheets[index] ?? null;
                    },
                    *[Symbol.iterator]() {
                        for (const styleSheet of styleSheets) {
                            yield styleSheet;
                        }
                    },
                };
            },
            configurable: true,
            enumerable: true,
        });
    }
    return shadowRoot;
};
export {};
