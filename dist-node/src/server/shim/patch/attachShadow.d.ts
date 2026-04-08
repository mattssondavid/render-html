declare global {
    interface SerializableElement {
        getHTML: (options?: GetHTMLOptions) => string;
    }
    interface SerializableShadowRoot {
        readonly clonable: boolean;
        readonly delegatesFocus: boolean;
        readonly serializable: boolean;
    }
    interface AdoptedStyleSheetsShadowRoot {
        adoptedStyleSheets: ReadonlyArray<CSSStyleSheet[]>;
        readonly styleSheets: StyleSheetList;
    }
    interface Element extends SerializableElement {
    }
    interface ShadowRoot extends SerializableElement, SerializableShadowRoot, AdoptedStyleSheetsShadowRoot {
    }
}
export {};
