/**
 * Serialise HTML fragments
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#serialising-html-fragments
 *
 * @param {Node} node The node to serialise, where `node` is expected to be
 * either an `Element`, `ShadowRoot` or a `DocumentFragment`
 * @returns {string} The string representing the HTML serialisation of the node
 * @throws {Error} Throws an error if incorrect node argument
 */
export const serialiseHTMLfragment = (node: Node): string => {
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

const serialiseNode = (node: Node): string => {
    switch (node.nodeType) {
        case Node.ELEMENT_NODE: {
            const el = node as Element;
            let html = `<${el.tagName.toLowerCase()}`;
            for (const attr of Array.from(el.attributes)) {
                html += ` ${attr.name}="${sanitiseText(attr.value)}"`;
            }
            html += '>';
            // Serialise children in tree order
            html += Array.from(el.childNodes)
                .map((child): string => serialiseNode(child))
                .join('');
            html += `</${el.tagName.toLowerCase()}>`;
            return html;
        }
        case Node.TEXT_NODE:
            return sanitiseText(node.textContent ?? '');
        case Node.COMMENT_NODE:
            return `<!--${(node as Comment).data}-->`;
        case Node.DOCUMENT_FRAGMENT_NODE: {
            return Array.from(node.childNodes)
                .map((child): string => serialiseNode(child))
                .join('');
        }
        default:
            return '';
    }
};

const sanitiseText = (text: string): string => {
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
