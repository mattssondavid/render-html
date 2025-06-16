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

const serialiseNode = (node: Node): string => {
    switch (node.nodeType) {
        case Node.ELEMENT_NODE: {
            const el = node as Element;

            if (obsoleteElements.has(el.tagName.toLowerCase())) {
                // Just skip obsolete elements
                return '';
            }

            let html = `<${el.tagName.toLowerCase()}`;
            for (const attr of Array.from(el.attributes)) {
                html += ` ${attr.name}="${escapeAttribute(attr.value)}"`;
            }
            html += '>';

            // Handle voide elements
            if (voidElements.has(el.tagName.toLowerCase())) {
                return html;
            }

            // Serialise children in tree order
            html += Array.from(el.childNodes)
                .map((child): string => serialiseNode(child))
                .join('');
            html += `</${el.tagName.toLowerCase()}>`;
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
                .map((child): string => serialiseNode(child))
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

const escapeAttribute = (value: string): string => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/\u00A0/g, '&nbsp;')
        .replace(/"/g, '&quot;');
};

const escapeText = (text: string): string => {
    return text.replace(/[&<>"']/g, (c): string =>
        c === '&'
            ? '&amp;'
            : c === '<'
            ? '&lt;'
            : c === '>'
            ? '&gt;'
            : c === '"'
            ? '&quot;'
            : c === "'"
            ? '&#39;'
            : c
    );
};

/**
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#rcdata-state
 */
const escapeRCdata = (text: string): string => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/\u00A0/g, '&nbsp;')
        .replace(/</g, '&lt;');
};

type GetHTMLOptions = {
    readonly serializableShadowRoots?: boolean;
    readonly shadowRoots?: ShadowRoot[];
};

/**
 * Serialise HTML fragments
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#serialising-html-fragments
 *
 * @param {Node} node The node to serialise, where `node` is expected to be
 * either an `Element`, `ShadowRoot` or a `DocumentFragment`
 * @param {{serializableShadowRoots: boolean, shadowRoots: globalThis.ShadowRoot[]}} options Options
 * @returns {string} The string representing the HTML serialisation of the node
 * @throws {Error} Throws an error if incorrect node argument
 */
export const serialiseHTMLfragment = (
    node: Node,
    options?: GetHTMLOptions | undefined
): string => {
    if (
        node.nodeType !== Node.ELEMENT_NODE &&
        node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
    ) {
        throw new Error(`Incorrect node type`);
    }

    // ToDO: Implement the real algorithm, for now just do it quick and dirty
    const fragments = [
        ...node.childNodes
            .values()
            .map((currentNode): string => serialiseNode(currentNode)),
    ];

    return fragments.join('');
};
