/**
 * Monkey Patch ShadowRoot.attachShadow from JSDOM while waiting for JSDOM
 * to fix their ShadowRoot implementation
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow
 * @see https://github.com/jsdom/jsdom/
 */

declare global {
    interface SerializableElement {
        getHTML: (options?: GetHTMLOptions) => string;
    }

    /*
     * Monkey patch ShadowRoot properties
     */
    interface SerializableShadowRoot {
        /**
         * `true` if the shadow root is clonable, and `false` otherwise
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/clonable
         */
        readonly clonable: boolean;

        /**
         * `true` if the shadow root delegates focus, and `false` otherwise
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/delegatesFocus
         */
        readonly delegatesFocus: boolean;

        /**
         * `true` if the shadow root is serializable, and `false` otherwise
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/serializable
         */
        readonly serializable: boolean;
    }

    interface AdoptedStyleSheetsShadowRoot {
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/adoptedStyleSheets
         */
        adoptedStyleSheets: CSSStyleSheet[];

        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/styleSheets
         */
        readonly styleSheets: StyleSheetList;
    }

    interface Element extends SerializableElement {}

    interface ShadowRoot
        extends SerializableElement,
            SerializableShadowRoot,
            AdoptedStyleSheetsShadowRoot {}
}

const originalAttachShadow = globalThis.Element.prototype.attachShadow;
globalThis.Element.prototype.attachShadow = function (
    options: ShadowRootInit & { clonable?: boolean }
): ShadowRoot {
    const shadowRoot = originalAttachShadow.apply(this, [options]);

    /*
     * Set Web API specification defaults and then monkey patch based on the
     * provided ShadowRoot initialisation options
     */
    if (typeof shadowRoot.clonable === 'undefined') {
        (shadowRoot.clonable as boolean) = false;
    }
    if (typeof options.clonable === 'boolean') {
        (shadowRoot.clonable as boolean) = options.clonable;
    }

    if (typeof shadowRoot.delegatesFocus === 'undefined') {
        (shadowRoot.delegatesFocus as boolean) = false;
    }
    if (typeof options.delegatesFocus === 'boolean') {
        (shadowRoot.delegatesFocus as boolean) = options.delegatesFocus;
    }

    if (typeof shadowRoot.serializable === 'undefined') {
        (shadowRoot.serializable as boolean) = false;
    }
    if (typeof options.serializable === 'boolean') {
        (shadowRoot.serializable as boolean) = options.serializable;
    }

    if (
        typeof shadowRoot.adoptedStyleSheets === 'undefined' &&
        typeof shadowRoot.styleSheets === 'undefined'
    ) {
        // Add adoptedStyleSheets
        Object.defineProperty(shadowRoot, 'adoptedStyleSheets', {
            get(): CSSStyleSheet[] {
                if (!this._adoptedStyleSheets) {
                    this._adoptedStyleSheets = [];
                }
                return this._adoptedStyleSheets;
            },
            set(sheets): void {
                if (!Array.isArray(sheets)) {
                    throw new TypeError(
                        'adoptedStyleSheets must be an Array of CSSStyleSheet'
                    );
                }
                this._adoptedStyleSheets = sheets;
            },
            configurable: true,
            enumerable: true,
        });

        // Add styleSheets (readonly)
        Object.defineProperty(shadowRoot, 'styleSheets', {
            get(): StyleSheetList {
                const styleSheetTags = Array.from(
                    shadowRoot.querySelectorAll('style')
                )
                    .map((style): CSSStyleSheet | null => style.sheet)
                    .filter((sheet): sheet is CSSStyleSheet => sheet !== null);

                const styleSheets = [...styleSheetTags];

                return {
                    length: styleSheets.length,
                    item(index): CSSStyleSheet {
                        return styleSheets[index] ?? null;
                    },
                    *[Symbol.iterator](): ArrayIterator<CSSStyleSheet> {
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
