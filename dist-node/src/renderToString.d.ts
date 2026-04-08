import { type TemplateResult } from './html.ts';
type RenderToStringOptions = {
    renderer?: (node: Node) => string;
    customElements?: CustomElementRegistry;
    serializeShadowRootAdoptedStyleSheets?: boolean;
};
export declare const renderToString: (templateResult: TemplateResult, options?: RenderToStringOptions) => string;
export {};
