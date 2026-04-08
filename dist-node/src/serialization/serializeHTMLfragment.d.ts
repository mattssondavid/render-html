type GetHTMLOptions = {
    readonly serializableShadowRoots?: boolean;
    readonly shadowRoots?: ShadowRoot[];
};
export declare const serializeHTMLfragment: (node: Node, options?: GetHTMLOptions | undefined) => string;
export {};
