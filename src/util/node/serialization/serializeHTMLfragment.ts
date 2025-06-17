/*
 * Element types
 * @see https://html.spec.whatwg.org/multipage/syntax.html#elements-2
 */
const obsoleteElements = new Set([
    'basefont',
    'bgsound',
    'frame',
    'keygen',
    'param',
]);

const rawTextElements = new Set([
    'script',
    'style',
    'xmp',
    'iframe',
    'noembed',
    'noframes',
    'plaintext',
    'noscript',
]);

const voidElements = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'source',
    'track',
    'wbr',
]);

/**
 * Escape attribute data
 *
 * Replace `&`, `"`, and `<`.
 * Only needed for Element node attributes (i.e. attr nodes)
 *
 * @eee https://html.spec.whatwg.org/multipage/parsing.html#serialising-html-fragments
 * @see https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(double-quoted)-state
 */
const escapeAttribute = (value: string): string => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
};

/**
 * Escape text node value
 *
 * Replace `&`, `U+00A0` (the no-break space character), `<`, or `>`
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#escapingString
 */
const escapeText = (value: string): string => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/\u00A0/g, '&nbsp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};

type GetHTMLOptions = {
    readonly serializableShadowRoots?: boolean;
    readonly shadowRoots?: ShadowRoot[];
};

/**
 * Serialise HTML fragments
 *
 * > "The algorithm serialises the `children` of the `node` being serialized,
 * not the [actual] node itself."
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#serialising-html-fragments
 *
 * @param {Node} node The node to serialise, where `node` is expected to be
 * either an `Element`, `ShadowRoot` or a `DocumentFragment`
 * @param {{serializableShadowRoots: boolean, shadowRoots: globalThis.ShadowRoot[]}} options Options
 * @returns {string} The string representing the HTML serialisation of the node
 */
export const serializeHTMLfragment = (
    node: Node,
    options?: GetHTMLOptions | undefined
): string => {
    /*
     * Check for node serialisation as void, i.e the node serialises as a void
     * element
     */
    if (
        node.nodeType === Node.ELEMENT_NODE &&
        (obsoleteElements.has((node as Element).tagName.toLowerCase()) ||
            voidElements.has((node as Element).tagName.toLowerCase()))
    ) {
        return '';
    }

    /*
     * Special handle the `template` element
     */
    if (
        node.nodeType === Node.ELEMENT_NODE &&
        node instanceof HTMLTemplateElement
    ) {
        node = node.content; // DocumentFragment
    }

    let serializeResult = '';

    /*
     * Process `ShadowHost` node
     * @see https://dom.spec.whatwg.org/#element-shadow-host
     */
    if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).shadowRoot !== null
    ) {
        const shadow = (node as Element).shadowRoot!;
        if (
            (options?.serializableShadowRoots === true &&
                shadow.serializable === true) ||
            options?.shadowRoots?.includes(shadow)
        ) {
            const template =
                `<template shadowrootmode="${shadow.mode}"` +
                (shadow.delegatesFocus ? ' shadowrootdelegatesfocus=""' : '') +
                (shadow.serializable ? ' shadowrootserializable=""' : '') +
                (shadow.clonable ? ' shadowrootclonable=""' : '') +
                // Skip scoped custom element registry for now, `customElements`
                // does not currently exist on a `ShadowRoot`
                '>' +
                serializeHTMLfragment(shadow, options) +
                '</template>';
            serializeResult += template;
        }
    }

    /**
     * Process each child node
     */
    const fragments = Array.from(node.childNodes).map(
        (currentNode: Node): string => {
            let fragment;
            switch (currentNode.nodeType) {
                case Node.ELEMENT_NODE: {
                    const tagName = (
                        currentNode as Element
                    ).tagName.toLowerCase();
                    fragment = `<${tagName}`;

                    // Handle attributes
                    // Skip `is` property, it is a browswer internal value
                    fragment += [...(currentNode as Element).attributes]
                        .map(
                            (attr): string =>
                                ` ${
                                    attr.namespaceURI
                                        ? attr.name
                                        : attr.localName.toLowerCase()
                                }="${escapeAttribute(attr.value)}"`
                        )
                        .join('');

                    fragment += '>';

                    // Handle void elements
                    if (
                        voidElements.has(tagName) ||
                        obsoleteElements.has(tagName)
                    ) {
                        return fragment;
                    }

                    fragment += serializeHTMLfragment(currentNode, options);
                    fragment += `</${tagName}>`;
                    return fragment;
                }

                case Node.TEXT_NODE: {
                    const parent = currentNode.parentNode;
                    if (parent && parent.nodeType === Node.ELEMENT_NODE) {
                        const tagName = (
                            parent as Element
                        ).tagName.toLowerCase();
                        if (rawTextElements.has(tagName)) {
                            return (currentNode as Text).data;
                        }
                    }
                    return escapeText((currentNode as Text).data);
                }

                case Node.COMMENT_NODE: {
                    return `<!--${(currentNode as Comment).data}-->`;
                }

                case Node.PROCESSING_INSTRUCTION_NODE: {
                    return `<?${
                        (currentNode as ProcessingInstruction).target
                    } ${(currentNode as ProcessingInstruction).data}>`;
                }

                case Node.DOCUMENT_TYPE_NODE: {
                    return `<!DOCTYPE ${(currentNode as DocumentType).name}>`;
                }

                default: {
                    return '';
                }
            }
        }
    );
    serializeResult += fragments.join('');

    return serializeResult;
};
