import { isTemplateResult } from "./html.js";
import { serializeHTMLfragment } from "./serialization/serializeHTMLfragment.js";
const interpolate = (templateResult) => {
    const { templateWithPlaceholders, partMeta, substitutions } = templateResult;
    let result = templateWithPlaceholders;
    partMeta.forEach((meta) => {
        const substitution = substitutions[meta.substitutionIndex];
        if (isTemplateResult(substitution)) {
            result = result.replace(meta.substitutionPlaceholder, String(interpolate(substitution)));
        }
        else {
            switch (meta.type) {
                case 'attr':
                case 'text': {
                    result = result.replace(meta.substitutionPlaceholder, String(substitution));
                    break;
                }
                case 'event': {
                    const reEvent = /([^\s=>\/]+)\s*=\s*(['"]?)([^'"]*)(['"]?)/;
                    if (reEvent.test(result)) {
                        const match = result.match(reEvent);
                        if (match) {
                            const event = match[1];
                            if (event.includes(meta.event)) {
                                const index = result.indexOf(event);
                                const removedEvent = result.replace(reEvent, '');
                                result =
                                    removedEvent.slice(0, index - 1) +
                                        removedEvent.slice(index);
                            }
                        }
                    }
                    break;
                }
            }
        }
    });
    return result;
};
export const renderToString = (templateResult, options) => {
    const templateContent = interpolate(templateResult);
    let fragment;
    if (/^\s*<html[\s>]/gim.test(templateContent)) {
        const parser = new self.DOMParser();
        const doc = parser.parseFromString(templateContent, 'text/html');
        const docTypematch = templateContent.match(/^\s*<!DOCTYPE\s+([^\s>]+)(?:\s+(PUBLIC|SYSTEM)\s+"([^"]*)"(?:\s+"([^"]*)")?)?\s*>/i);
        if (docTypematch) {
            const newDocType = self.document.implementation.createDocumentType(docTypematch[1] ?? 'html', docTypematch[3] ?? '', docTypematch[4] ?? '');
            if (doc.doctype) {
                doc.removeChild(doc.doctype);
            }
            doc.insertBefore(newDocType, doc.documentElement);
        }
        fragment = doc;
    }
    else {
        const template = self.document.createElement('template');
        template.innerHTML = templateContent;
        fragment = template.content;
    }
    if (options && options.customElements) {
        self.customElements = options.customElements;
    }
    if (options && options.renderer) {
        return options.renderer(fragment);
    }
    else {
        const customTagPattern = /[a-z]+-[a-z]+/;
        const walker = self.document.createTreeWalker(fragment, self.NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node) => {
                if (customTagPattern.test(node.tagName.toLowerCase()))
                    return self.NodeFilter.FILTER_ACCEPT;
                return self.NodeFilter.FILTER_SKIP;
            },
        });
        const _serializeOptions = [];
        while (walker.nextNode()) {
            const element = walker.currentNode;
            const definition = self.customElements.get(element.tagName.toLowerCase());
            if (definition) {
                self.customElements.upgrade(element);
                if (element.shadowRoot) {
                    _serializeOptions.push({
                        serializableShadowRoots: element.shadowRoot.serializable ?? undefined,
                        shadowRoots: [element.shadowRoot],
                    });
                }
                else {
                    const doc = self.document.implementation.createHTMLDocument();
                    const fakeElement = new definition();
                    doc.body.appendChild(fakeElement);
                    if (fakeElement.shadowRoot) {
                        _serializeOptions.push({
                            serializableShadowRoots: fakeElement.shadowRoot.serializable ??
                                undefined,
                            shadowRoots: [fakeElement.shadowRoot],
                        });
                        fakeElement.append(...element.childNodes);
                        element.replaceWith(fakeElement);
                    }
                }
            }
        }
        const serializeOptions = _serializeOptions.reduce((accumulator, currentValue) => {
            let serializableShadowRoots = currentValue.serializableShadowRoots;
            if (!serializableShadowRoots) {
                serializableShadowRoots =
                    accumulator?.serializableShadowRoots;
            }
            const shadowRoots = [
                ...(accumulator?.shadowRoots ?? []),
                ...(currentValue.shadowRoots ?? []),
            ];
            return {
                serializableShadowRoots,
                shadowRoots,
            };
        }, undefined);
        if (options && options.serializeShadowRootAdoptedStyleSheets) {
            patchShadowHostNodesWithInlineStyles(fragment);
        }
        return serializeHTMLfragment(fragment, serializeOptions);
    }
};
const patchShadowHostNodesWithInlineStyles = (node) => {
    const insertStyleNodesFromAdoptedStylesOnShadowRoots = (node) => {
        if (node.nodeType === self.Node.ELEMENT_NODE &&
            node.shadowRoot !== null) {
            const shadow = node.shadowRoot;
            shadow.adoptedStyleSheets
                .map((sheet) => {
                const rules = [...sheet.cssRules].map((rule) => rule.cssText);
                const styleElement = shadow.ownerDocument.createElement('style');
                styleElement.textContent = rules.join('');
                return styleElement;
            })
                .forEach((styleElement) => shadow.insertBefore(styleElement, shadow.firstChild));
        }
    };
    insertStyleNodesFromAdoptedStylesOnShadowRoots(node);
    Array.from(node.childNodes).forEach(insertStyleNodesFromAdoptedStylesOnShadowRoots);
    return node;
};
