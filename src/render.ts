import { isTemplateResult, type TemplateResult } from './html.ts';

type NodeInstance = {
    readonly parent: Node;
    readonly nodes: Node[];
    readonly parts: Part[];
};

type Part =
    | {
          readonly type: 'text';
          readonly lastValue: unknown;
          readonly nodes: Node[];
      }
    | {
          readonly type: 'attr';
          readonly attr: string;
          readonly node: Element;
      }
    | {
          readonly type: 'event';
          readonly event: string;
          readonly lastEventListener?: EventListener;
          readonly node: Element;
      };

const nodeInstanceCache = new WeakMap<Node, NodeInstance>();

const isHandleEventObject = (
    obj: unknown
): obj is { handleEvent(event?: Event): void } => {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'handleEvent' in obj &&
        typeof (obj as { handleEvent: unknown }).handleEvent === 'function'
    );
};

const createNodeInstance = (templateResult: TemplateResult): NodeInstance => {
    const parts: Part[] = [];
    const { templateWithPlaceholders, partMeta, substitutions } =
        templateResult;
    const template = self.document.createElement('template');
    template.innerHTML = templateWithPlaceholders;
    const fragmentRoot = template.content.cloneNode(true);

    /* Map each substitute placeholder to the actual node to replace */
    const substituteNodes = new Map<string, Node>();
    const walker = self.document.createTreeWalker(
        fragmentRoot,
        self.NodeFilter.SHOW_ALL,
        {
            // We only care for placeholders in the parsed template
            //
            // Note. A TreeWalker will never show the Attr node since its parent
            // node is always null. Instead, to find the Attr node, we need to
            // use the `Element.attributes` instead.
            // Because of this, `NodeFilter.SHOW_COMMENT` cannot be used.
            acceptNode: (node: Node): number => {
                // Check for attribute placeholders
                if (node.nodeType === self.Node.ELEMENT_NODE) {
                    const attrs = Array.from((node as Element).attributes);
                    return attrs.some(
                        (attr: Attr): boolean =>
                            attr.nodeValue?.includes('$attr-') ||
                            attr.nodeValue?.includes('$event-') ||
                            false
                    )
                        ? self.NodeFilter.FILTER_ACCEPT
                        : self.NodeFilter.FILTER_SKIP;
                }

                // Check for Text placeholder
                else if (
                    node.nodeType === self.Node.COMMENT_NODE &&
                    node.nodeValue?.includes('$text-')
                ) {
                    return self.NodeFilter.FILTER_ACCEPT;
                }

                return self.NodeFilter.FILTER_SKIP;
            },
        }
    );
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeType === self.Node.ELEMENT_NODE) {
            for (const attr of Array.from((node as Element).attributes)) {
                substituteNodes.set(attr.nodeValue!, node);
            }
        } else {
            substituteNodes.set(`<!--${node.nodeValue}-->`, node);
        }
    }

    /* Perform initial ("first render") DOM manipulation */
    partMeta.forEach((meta): void => {
        const node = substituteNodes.get(meta.substitutionPlaceholder);
        if (!node) {
            return;
        }
        const substitution = substitutions[meta.substitutionIndex];

        switch (meta.type) {
            case 'attr': {
                (node as Element).setAttribute(
                    meta.attr!,
                    String(substitution)
                );
                parts.push({
                    type: 'attr',
                    node: node as Element,
                    attr: meta.attr!,
                });
                break;
            }

            case 'event': {
                // Check substitution value to determine what to do
                let eventListener: EventListener | undefined = undefined;
                if (typeof substitution === 'function') {
                    eventListener = substitution as EventListener;
                } else if (isHandleEventObject(substitution)) {
                    eventListener = substitution.handleEvent as EventListener;
                }
                if (eventListener) {
                    (node as Element).addEventListener(
                        meta.event!,
                        eventListener
                    );
                }
                parts.push({
                    type: 'event',
                    node: node as Element,
                    event: meta.event!,
                    lastEventListener: eventListener,
                });
                break;
            }

            case 'text': {
                if (isTemplateResult(substitution)) {
                    // Append each nested template's nodes to current node's
                    // parent node
                    let nestedInstance = createNodeInstance(substitution);
                    if (node.parentNode) {
                        nestedInstance = {
                            ...nestedInstance,
                            parent: node.parentNode,
                        };
                    }
                    const fragment = self.document.createDocumentFragment();
                    nestedInstance.nodes.forEach((nestedNode: Node): void => {
                        fragment.appendChild(nestedNode);
                    });
                    // Since `node` is expected to be a Comment node, we cannot
                    // use `Element.replaceWith()`
                    node.parentNode?.replaceChild(fragment, node);
                    parts.push({
                        type: 'text',
                        nodes: nestedInstance.nodes,
                        lastValue: substitution, // Used for render update
                    });
                } else if (Array.isArray(substitution)) {
                    const fragment = self.document.createDocumentFragment();
                    substitution.forEach((item): void => {
                        if (isTemplateResult(item)) {
                            const nestedInstance = createNodeInstance(item);
                            nestedInstance.nodes.forEach(
                                (nestedNode: Node): void => {
                                    fragment.appendChild(nestedNode);
                                }
                            );
                        } else {
                            const text = self.document.createTextNode(
                                String(item)
                            );
                            fragment.appendChild(text);
                        }
                    });
                    const childNodes = [...fragment.childNodes];
                    node.parentNode?.replaceChild(fragment, node);
                    parts.push({
                        type: 'text',
                        nodes: childNodes,
                        lastValue: substitution, // Used for render update
                    });
                } else {
                    const text = self.document.createTextNode(
                        String(substitution)
                    );
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

    substituteNodes.clear(); // For memory management

    return {
        parent: null as unknown as Node,
        nodes: Array.from(fragmentRoot.childNodes),
        parts,
    };
};

/**
 * Render a HTML Template Result to a DOM Node
 *
 * @param {TemplateResult} templateResult - The template to render
 * @param {Node} container - The node to use as a host for the rendered HTML template
 */
export const render = (
    templateResult: TemplateResult,
    container: Node
): void => {
    if (!nodeInstanceCache.has(container)) {
        // First time render with substitutions
        const instance: NodeInstance = {
            ...createNodeInstance(templateResult),
            parent: container,
        };
        for (const node of instance.nodes) {
            instance.parent.appendChild(node);
        }
        nodeInstanceCache.set(container, instance);
        return;
    }
    // Update with new subsitution values
    const { parts } = nodeInstanceCache.get(container)!;

    templateResult.partMeta.forEach((meta, index): void => {
        let part = parts[index];
        const substitution =
            templateResult.substitutions[meta.substitutionIndex];
        switch (part.type) {
            case 'attr': {
                part.node.setAttribute(part.attr, String(substitution));
                break;
            }

            case 'event': {
                let eventListener: EventListener | undefined = undefined;
                if (typeof substitution === 'function') {
                    eventListener = substitution as EventListener;
                } else if (isHandleEventObject(substitution)) {
                    eventListener = substitution.handleEvent as EventListener;
                }
                if (part.lastEventListener) {
                    part.node.removeEventListener(
                        part.event,
                        part.lastEventListener
                    );
                }
                if (eventListener) {
                    part.node.addEventListener(part.event, eventListener);
                }
                part = { ...part, lastEventListener: eventListener };
                break;
            }

            case 'text': {
                if (substitution === part.lastValue) {
                    // No changes
                    break;
                }

                if (isTemplateResult(substitution)) {
                    if (isTemplateResult(part.lastValue)) {
                        // Recursively update
                        const nestedInstance = createNodeInstance(
                            part.lastValue
                        );
                        render(
                            substitution,
                            nestedInstance.parent ?? part.nodes[0].parentNode!
                        );
                    } else {
                        // Replace nodes
                        const nestedInstance = createNodeInstance(substitution);
                        const fragment = self.document.createDocumentFragment();
                        nestedInstance.nodes.forEach(
                            (nestedNode: Node): void => {
                                fragment.appendChild(nestedNode);
                            }
                        );
                        const firstNode = part.nodes[0];
                        if (firstNode && firstNode.parentNode) {
                            firstNode.parentNode.replaceChild(
                                fragment,
                                firstNode
                            );
                            part = { ...part, nodes: nestedInstance.nodes };
                        }
                    }
                } else if (Array.isArray(substitution)) {
                    if (
                        part.lastValue &&
                        Array.isArray(part.lastValue) &&
                        part.lastValue.length === substitution.length &&
                        substitution.every(
                            (value: unknown, index: number): boolean =>
                                part.type === 'text' &&
                                value === (part.lastValue as unknown[])[index]
                        )
                    ) {
                        break;
                    }
                    const fragment = self.document.createDocumentFragment();
                    substitution.forEach((item): void => {
                        if (isTemplateResult(item)) {
                            const nestedInstance = createNodeInstance(item);
                            nestedInstance.nodes.forEach(
                                (nestedNode: Node): void => {
                                    fragment.appendChild(nestedNode);
                                }
                            );
                        } else {
                            const text = self.document.createTextNode(
                                String(item)
                            );
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
                } else {
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
