import { isTemplateResult, type TemplateResult } from './html.ts';
import { getNodeFromPathViaAncesterNode } from './util/node/getNodeFromPathViaAncesterNode.ts';

type NodeInstance = {
    parent: Node;
    nodes: Node[];
    parts: Part[];
};

type Part =
    | {
          type: 'text';
          nodes: Node[];
          lastValue: unknown;
      }
    | {
          type: 'attr';
          node: Element;
          attr: string;
      }
    | {
          type: 'event';
          node: Element;
          event: string;
          lastEventListener?: EventListener;
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
    const { template, partMeta, substitutions } = templateResult;
    const fragmentRoot = template.content.cloneNode(true);

    // Track nodes to substitute.
    // When we are actually traversing the `partMeta` then we will do DOM
    // manipulation which can cause the meta node path to become inaccurate
    const subsituteNodes = partMeta.map((meta): Node | null =>
        getNodeFromPathViaAncesterNode(meta.path, fragmentRoot)
    );

    // Perform initial ("first render") DOM manipulation
    partMeta.forEach((meta, index): void => {
        const substitution = substitutions[index];
        const node = subsituteNodes[index];
        if (node === null) {
            return;
        }

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
                let eventListener: EventListener | null = null;
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
                    parts.push({
                        type: 'event',
                        node: node as Element,
                        event: meta.event!,
                        lastEventListener: eventListener,
                    });
                }
                break;
            }

            case 'text': {
                if (isTemplateResult(substitution)) {
                    // Append each nested template's nodes to current node's
                    // parent node
                    const nestedInstance = createNodeInstance(substitution);
                    if (node.parentNode) {
                        nestedInstance.parent = node.parentNode;
                    }
                    const fragment = document.createDocumentFragment();
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
                    const fragment = document.createDocumentFragment();
                    substitution.forEach((item): void => {
                        if (isTemplateResult(item)) {
                            const nestedInstance = createNodeInstance(item);
                            nestedInstance.nodes.forEach(
                                (nestedNode: Node): void => {
                                    fragment.appendChild(nestedNode);
                                }
                            );
                        } else {
                            const text = document.createTextNode(String(item));
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
                    const text = document.createTextNode(String(substitution));
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

    return {
        parent: null as unknown as Node,
        nodes: Array.from(fragmentRoot.childNodes),
        parts,
    };
};

/**
 * Render a HTML Template Result to a DOM Node
 *
 * @param {TemplateResult} templateResult The template to render
 * @param {Node} container The node to use as a host for the rendered HTML template
 */
export const render = (
    templateResult: TemplateResult,
    container: Node
): void => {
    if (!nodeInstanceCache.has(container)) {
        // First time render with substitutions
        const instance = createNodeInstance(templateResult);
        instance.parent = container;
        for (const node of instance.nodes) {
            instance.parent.appendChild(node);
        }
        nodeInstanceCache.set(container, instance);
    } else {
        // Update with new subsitution values
        const instance = nodeInstanceCache.get(container);
        instance?.parts.forEach((part, index): void => {
            const substitution = templateResult.substitutions[index];
            switch (part.type) {
                case 'attr': {
                    part.node.setAttribute(part.attr, String(substitution));
                    break;
                }

                case 'event': {
                    let eventListener: EventListener | null = null;
                    if (typeof substitution === 'function') {
                        eventListener = substitution as EventListener;
                    } else if (isHandleEventObject(substitution)) {
                        eventListener =
                            substitution.handleEvent as EventListener;
                    }
                    if (part.lastEventListener) {
                        part.node.removeEventListener(
                            part.event,
                            part.lastEventListener
                        );
                    }
                    if (eventListener) {
                        part.node.addEventListener(part.event, eventListener);
                        part.lastEventListener = eventListener;
                    }
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
                                nestedInstance.parent ??
                                    part.nodes[0].parentNode!
                            );
                        } else {
                            // Replace nodes
                            const nestedInstance =
                                createNodeInstance(substitution);
                            const fragment = document.createDocumentFragment();
                            nestedInstance.nodes.forEach(
                                (nestedNode: Node): void => {
                                    fragment.appendChild(nestedNode);
                                }
                            );
                            const firstNode = part.nodes[0];
                            firstNode?.replaceChild(fragment, firstNode);
                            part.nodes = nestedInstance.nodes;
                        }
                    } else if (Array.isArray(substitution)) {
                        if (
                            part.lastValue &&
                            Array.isArray(part.lastValue) &&
                            part.lastValue.length === substitution.length &&
                            substitution.every(
                                (value: unknown, index: number): boolean =>
                                    value ===
                                    (part.lastValue as unknown[])[index]
                            )
                        ) {
                            break;
                        }
                        const fragment = document.createDocumentFragment();
                        substitution.forEach((item): void => {
                            if (isTemplateResult(item)) {
                                const nestedInstance = createNodeInstance(item);
                                nestedInstance.nodes.forEach(
                                    (nestedNode: Node): void => {
                                        fragment.appendChild(nestedNode);
                                    }
                                );
                            } else {
                                const text = document.createTextNode(
                                    String(item)
                                );
                                fragment.appendChild(text);
                            }
                        });
                        const childNodes = [...fragment.childNodes];
                        part.nodes[0].parentNode?.replaceChildren(fragment);
                        part.nodes = childNodes;
                    } else {
                        part.nodes[0].textContent = String(substitution);
                    }
                    part.lastValue = substitution;
                    break;
                }
            }
        });
    }
};
