import { isTemplateResult } from "./html.js";
const nodeInstanceCache = new WeakMap();
const isHandleEventObject = (obj) => {
    return (typeof obj === 'object' &&
        obj !== null &&
        'handleEvent' in obj &&
        typeof obj.handleEvent === 'function');
};
const createNodeInstance = (templateResult) => {
    const parts = [];
    const { templateWithPlaceholders, partMeta, substitutions } = templateResult;
    const template = self.document.createElement('template');
    template.innerHTML = templateWithPlaceholders;
    const fragmentRoot = template.content.cloneNode(true);
    const substituteNodes = new Map();
    const walker = self.document.createTreeWalker(fragmentRoot, self.NodeFilter.SHOW_ALL, {
        acceptNode: (node) => {
            if (node.nodeType === self.Node.ELEMENT_NODE) {
                const attrs = Array.from(node.attributes);
                return attrs.some((attr) => attr.nodeValue?.includes('$attr-') ||
                    attr.nodeValue?.includes('$event-') ||
                    false)
                    ? self.NodeFilter.FILTER_ACCEPT
                    : self.NodeFilter.FILTER_SKIP;
            }
            else if (node.nodeType === self.Node.COMMENT_NODE &&
                node.nodeValue?.includes('$text-')) {
                return self.NodeFilter.FILTER_ACCEPT;
            }
            return self.NodeFilter.FILTER_SKIP;
        },
    });
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeType === self.Node.ELEMENT_NODE) {
            for (const attr of Array.from(node.attributes)) {
                substituteNodes.set(attr.nodeValue, node);
            }
        }
        else {
            substituteNodes.set(`<!--${node.nodeValue}-->`, node);
        }
    }
    partMeta.forEach((meta) => {
        const node = substituteNodes.get(meta.substitutionPlaceholder);
        if (!node) {
            return;
        }
        const substitution = substitutions[meta.substitutionIndex];
        switch (meta.type) {
            case 'attr': {
                node.setAttribute(meta.attr, String(substitution));
                parts.push({
                    type: 'attr',
                    node: node,
                    attr: meta.attr,
                });
                break;
            }
            case 'event': {
                let eventListener = undefined;
                if (typeof substitution === 'function') {
                    eventListener = substitution;
                }
                else if (isHandleEventObject(substitution)) {
                    eventListener = substitution.handleEvent;
                }
                if (eventListener) {
                    node.addEventListener(meta.event, eventListener);
                }
                parts.push({
                    type: 'event',
                    node: node,
                    event: meta.event,
                    lastEventListener: eventListener,
                });
                break;
            }
            case 'text': {
                if (isTemplateResult(substitution)) {
                    let nestedInstance = createNodeInstance(substitution);
                    if (node.parentNode) {
                        nestedInstance = {
                            ...nestedInstance,
                            parent: node.parentNode,
                        };
                    }
                    const fragment = self.document.createDocumentFragment();
                    nestedInstance.nodes.forEach((nestedNode) => {
                        fragment.appendChild(nestedNode);
                    });
                    node.parentNode?.replaceChild(fragment, node);
                    parts.push({
                        type: 'text',
                        nodes: nestedInstance.nodes,
                        lastValue: substitution,
                    });
                }
                else if (Array.isArray(substitution)) {
                    const fragment = self.document.createDocumentFragment();
                    substitution.forEach((item) => {
                        if (isTemplateResult(item)) {
                            const nestedInstance = createNodeInstance(item);
                            nestedInstance.nodes.forEach((nestedNode) => {
                                fragment.appendChild(nestedNode);
                            });
                        }
                        else {
                            const text = self.document.createTextNode(String(item));
                            fragment.appendChild(text);
                        }
                    });
                    const childNodes = [...fragment.childNodes];
                    node.parentNode?.replaceChild(fragment, node);
                    parts.push({
                        type: 'text',
                        nodes: childNodes,
                        lastValue: substitution,
                    });
                }
                else {
                    const text = self.document.createTextNode(String(substitution));
                    node.parentNode?.replaceChild(text, node);
                    parts.push({
                        type: 'text',
                        nodes: [text],
                        lastValue: substitution,
                    });
                }
                break;
            }
        }
    });
    substituteNodes.clear();
    return {
        parent: null,
        nodes: Array.from(fragmentRoot.childNodes),
        parts,
    };
};
export const render = (templateResult, container) => {
    if (!nodeInstanceCache.has(container)) {
        const instance = {
            ...createNodeInstance(templateResult),
            parent: container,
        };
        for (const node of instance.nodes) {
            instance.parent.appendChild(node);
        }
        nodeInstanceCache.set(container, instance);
        return;
    }
    const { parts } = nodeInstanceCache.get(container);
    templateResult.partMeta.forEach((meta, index) => {
        let part = parts[index];
        const substitution = templateResult.substitutions[meta.substitutionIndex];
        switch (part.type) {
            case 'attr': {
                part.node.setAttribute(part.attr, String(substitution));
                break;
            }
            case 'event': {
                let eventListener = undefined;
                if (typeof substitution === 'function') {
                    eventListener = substitution;
                }
                else if (isHandleEventObject(substitution)) {
                    eventListener = substitution.handleEvent;
                }
                if (part.lastEventListener) {
                    part.node.removeEventListener(part.event, part.lastEventListener);
                }
                if (eventListener) {
                    part.node.addEventListener(part.event, eventListener);
                }
                part = { ...part, lastEventListener: eventListener };
                break;
            }
            case 'text': {
                if (substitution === part.lastValue) {
                    break;
                }
                if (isTemplateResult(substitution)) {
                    if (isTemplateResult(part.lastValue)) {
                        const nestedInstance = createNodeInstance(part.lastValue);
                        render(substitution, nestedInstance.parent ?? part.nodes[0].parentNode);
                    }
                    else {
                        const nestedInstance = createNodeInstance(substitution);
                        const fragment = self.document.createDocumentFragment();
                        nestedInstance.nodes.forEach((nestedNode) => {
                            fragment.appendChild(nestedNode);
                        });
                        const firstNode = part.nodes[0];
                        if (firstNode && firstNode.parentNode) {
                            firstNode.parentNode.replaceChild(fragment, firstNode);
                            part = { ...part, nodes: nestedInstance.nodes };
                        }
                    }
                }
                else if (Array.isArray(substitution)) {
                    if (part.lastValue &&
                        Array.isArray(part.lastValue) &&
                        part.lastValue.length === substitution.length &&
                        substitution.every((value, index) => part.type === 'text' &&
                            value === part.lastValue[index])) {
                        break;
                    }
                    const fragment = self.document.createDocumentFragment();
                    substitution.forEach((item) => {
                        if (isTemplateResult(item)) {
                            const nestedInstance = createNodeInstance(item);
                            nestedInstance.nodes.forEach((nestedNode) => {
                                fragment.appendChild(nestedNode);
                            });
                        }
                        else {
                            const text = self.document.createTextNode(String(item));
                            fragment.appendChild(text);
                        }
                    });
                    if (part.nodes[0] && part.nodes[0].parentNode) {
                        const parent = part.nodes[0].parentNode;
                        parent.insertBefore(fragment, part.nodes[0]);
                        for (const oldNode of part.nodes) {
                            if (oldNode) {
                                parent.removeChild(oldNode);
                            }
                        }
                        part = { ...part, nodes: [...fragment.childNodes] };
                    }
                }
                else {
                    if (part.nodes && part.nodes[0]) {
                        part.nodes[0].textContent = String(substitution);
                    }
                }
                part = { ...part, lastValue: substitution };
                break;
            }
        }
    });
};
