/**
 * Element types
 * @see https://html.spec.whatwg.org/multipage/syntax.html#elements-2
 */
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

const obsoleteElements = new Set([
    'basefont',
    'bgsound',
    'frame',
    'keygen',
    'param',
]);

const rawTextElements = new Set(['script', 'style']);

const escapableRawTextElements = new Set(['textarea', 'title']);

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
 * Escape `Raw Character` Data
 *
 * Replace `<` and `&` as they are start of tags or entities in RC data.
 * Only needed for escapable raw text Element nodes.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#rcdata-state
 */
const escapeRCdata = (value: string): string => {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
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

const serializeNode = (node: Node): string => {
    if (node instanceof globalThis.HTMLTemplateElement) {
        node = node.content; // DocumentFragment
    }

    switch (node.nodeType) {
        case Node.ELEMENT_NODE: {
            const tag = (node as Element).tagName.toLowerCase();
            if (obsoleteElements.has(tag)) {
                // Just skip obsolete elements
                return '';
            }

            let html = `<${tag}`;
            for (const attr of Array.from((node as Element).attributes)) {
                html += ` ${attr.name}="${escapeAttribute(attr.value)}"`;
            }
            html += '>';

            // Handle voide elements
            if (voidElements.has(tag)) {
                return html;
            }

            // Serialise children in tree order
            html += Array.from(node.childNodes)
                .map((child): string => serializeNode(child))
                .join('');
            html += `</${tag}>`;
            return html;
        }
        case Node.TEXT_NODE: {
            const parent = node.parentNode;
            if (parent && parent.nodeType === Node.ELEMENT_NODE) {
                const tag = (parent as Element).tagName.toLowerCase();
                if (rawTextElements.has(tag)) {
                    return node.textContent ?? '';
                }
                if (escapableRawTextElements.has(tag)) {
                    return escapeRCdata(node.textContent ?? '');
                }
            }
            // Anything else
            return escapeText(node.textContent ?? '');
        }
        case Node.COMMENT_NODE:
            return `<!--${(node as Comment).data}-->`;
        case Node.DOCUMENT_FRAGMENT_NODE: {
            return Array.from(node.childNodes)
                .map((child): string => serializeNode(child))
                .join('');
        }
        case Node.DOCUMENT_TYPE_NODE: {
            const doctype = node as DocumentType;
            const parts =
                `${doctype.name} ${doctype.publicId} ${doctype.systemId}`.trim();
            return `<!DOCTYPE ${parts}>`.trim();
        }
        default:
            return '';
    }
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
            const template = `<template shadowrootmode="${shadow.mode}"\
                ${shadow.delegatesFocus ? 'shadowrootdelegatesfocus=""' : ''}\
                ${shadow.serializable ? 'shadowrootserializable=""' : ''}\
                ${shadow.clonable ? 'shadowrootclonable=""' : ''}\
                ></template>`;

            console.log(template);

            serializeResult += template;
        }
    }

    // ... done
    return serializeResult;
};
