declare global {
    interface CSSStyleSheet {
        replaceSync(cssText: string): void;
    }
}
export {};
