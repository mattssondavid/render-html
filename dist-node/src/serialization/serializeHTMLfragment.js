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
const escapeAttribute = (value) => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
};
const escapeText = (value) => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/\u00A0/g, '&nbsp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};
export const serializeHTMLfragment = (node, options) => {
    if (node.nodeType === self.Node.ELEMENT_NODE &&
        (obsoleteElements.has(node.tagName.toLowerCase()) ||
            voidElements.has(node.tagName.toLowerCase()))) {
        return '';
    }
    if (node.nodeType === self.Node.ELEMENT_NODE &&
        node instanceof self.HTMLTemplateElement) {
        node = node.content;
    }
    let serializeResult = '';
    if (node.nodeType === self.Node.ELEMENT_NODE &&
        node.shadowRoot !== null) {
        const shadow = node.shadowRoot;
        if ((options?.serializableShadowRoots === true &&
            shadow.serializable === true) ||
            options?.shadowRoots?.includes(shadow)) {
            const template = `<template shadowrootmode="${shadow.mode}"` +
                (shadow.delegatesFocus ? ' shadowrootdelegatesfocus=""' : '') +
                (shadow.serializable ? ' shadowrootserializable=""' : '') +
                (shadow.clonable ? ' shadowrootclonable=""' : '') +
                '>' +
                serializeHTMLfragment(shadow, options) +
                '</template>';
            serializeResult += template;
        }
    }
    const fragments = Array.from(node.childNodes).map((currentNode) => {
        let fragment;
        switch (currentNode.nodeType) {
            case self.Node.ELEMENT_NODE: {
                const tagName = currentNode.tagName.toLowerCase();
                fragment = `<${tagName}`;
                fragment += [...currentNode.attributes]
                    .map((attr) => ` ${attr.namespaceURI
                    ? attr.name
                    : attr.localName.toLowerCase()}="${escapeAttribute(attr.value)}"`)
                    .join('');
                fragment += '>';
                if (voidElements.has(tagName) ||
                    obsoleteElements.has(tagName)) {
                    return fragment;
                }
                fragment += serializeHTMLfragment(currentNode, options);
                fragment += `</${tagName}>`;
                return fragment;
            }
            case self.Node.TEXT_NODE: {
                const parent = currentNode.parentNode;
                if (parent && parent.nodeType === Node.ELEMENT_NODE) {
                    const tagName = parent.tagName.toLowerCase();
                    if (rawTextElements.has(tagName)) {
                        return currentNode.data;
                    }
                }
                return escapeText(currentNode.data);
            }
            case self.Node.COMMENT_NODE: {
                return `<!--${currentNode.data}-->`;
            }
            case self.Node.PROCESSING_INSTRUCTION_NODE: {
                return `<?${currentNode.target} ${currentNode.data}>`;
            }
            case self.Node.DOCUMENT_TYPE_NODE: {
                return `<!DOCTYPE ${currentNode.name}>`;
            }
            default: {
                return '';
            }
        }
    });
    serializeResult += fragments.join('');
    return serializeResult;
};
