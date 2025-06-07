/*
 * Below is in development experimenting from
 * https://www.youtube.com/watch?v=0C-y59betmY&list=PLdpUaRRxvs_SvYFG18jiI1MumBoPGFep7&index=87
 *
 * The idea is to make more efficient DOM manipulation by only updating bits
 * that neds to be updated. Also called "dirty checking" rendering.
 *
 * Thoughts:
 * * Should document fragment be used if the node has a lot of children? It would do 1 DOM insert instead of N-times (once per child)
 *
 * * Perhaps just use lit-html?
 */

type Part =
    | { type: 'text'; node: Text }
    | {
          type: 'attr';
          node: Element;
          attr: string;
      }
    | {
          type: 'event';
          node: Element;
          event: string;
          lastHandler?: EventListener;
      };

type PartMeta = {
    type: 'text' | 'attr' | 'event';
    path: number[];
    attr?: string;
    event?: string;
};

type TemplateCacheEntry = {
    template: HTMLTemplateElement;
    partMeta: PartMeta[];
};

/**
 * Determine current node's position in the node Tree as viewed from the
 * first parent's (e.g. an template DocumentFragment) children
 *
 * @returns {number[]} The path
 */
const getChildPathToAncesterNode = (
    node: Node,
    ancesterNode: Node
): number[] => {
    /*
     * Suppose the node template is:
     *
     * HTML
     * <div>
     *     Hello
     *     <!--$text$-->
     *     <span>
     *         <!--$text$-->
     *     </span>
     * </div>
     *
     * The fragment tree looks like this:
     *
     * root (DocumentFragment)
     *     0: DIV
     *         0: Text ("Hello\n ")
     *         1: Comment ("text")
     *         2: Text ("\n ")
     *         3: SPAN
     *             0: Comment ("text")
     *             1: Text ("\n")
     *
     * The path to the comment inside the SPAN is: [0, 3, 0]
     *
     * 0: first child of fragment (DIV)
     * 3: fourth child of DIV (SPAN)
     * 0: first child of SPAN (the comment node)
     *
     * When you traverse the nodes, you start at the root and walk:
     *
     * let node: Node = documentFragment;
     * for (const idx of path) {
     *     node = node.childNodes[idx];
     * }
     *
     * The resulting node is the node whose placeholder to replace or update.
     */

    const path = [];
    let testNode: Node | null = node;
    while (testNode !== null && testNode !== ancesterNode) {
        const parent: ParentNode | null = testNode.parentNode;
        if (!parent) {
            break;
        }
        const children = Array.from(parent.childNodes);
        path.unshift(children.indexOf(testNode as ChildNode));
        testNode = parent;
    }
    return path;
};

const getNodeFromPathViaAncesterNode = (
    path: number[],
    ancesterNode: Node
): Node | null => {
    return path.reduce((accumulator: Node, currentValue: number): Node => {
        return accumulator.childNodes[currentValue];
    }, ancesterNode);
};

const templateCache = new WeakMap<TemplateStringsArray, TemplateCacheEntry>();

const createTempleCacheEntry = (
    templateStrings: TemplateStringsArray
): TemplateCacheEntry => {
    /*
     * Parse templates
     *
     * Find substitution holes and mark each as a placeholder
     */
    let html = '';
    const reIsAttribute = /(\S+)=["']?/;
    const reIsEvent = /^on\w+$/i;

    templateStrings.forEach((templateItem, index): void => {
        html += templateItem;
        if (index < templateStrings.length - 1) {
            const attributeMatch = templateItem.match(reIsAttribute);
            if (attributeMatch) {
                html += reIsEvent.test(attributeMatch[1])
                    ? '<!--$event$-->'
                    : '<!--$attr$-->';
            } else {
                // The part must be a text node
                html += '<!--$text$-->';
            }
        }
    });

    const template = document.createElement('template');
    template.innerHTML = html.trim();

    /*
     * Find all substitution placeholders
     */
    const partMeta: PartMeta[] = [];

    const walker = document.createTreeWalker(
        template.content,
        NodeFilter.SHOW_ALL,
        {
            // We only care for placeholders in the parsed template
            //
            // Note. A TreeWalker will never show the Attr node since its parent
            // node is always null. Instead, to find the Attr node, we need to
            // use the `Element.attributes` instead.
            // Because of this, `NodeFilter.SHOW_COMMENT` cannot be used.
            acceptNode: (node): Node['ELEMENT_NODE'] | Node['TEXT_NODE'] => {
                // Check for attribute placeholders
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const attrNodes = Array.from((node as Element).attributes);
                    const acceptance = attrNodes.map(
                        (attr): boolean =>
                            attr.nodeValue === '<!--$attr$-->' ||
                            attr.nodeValue === '<!--$event$-->'
                    );
                    if (acceptance.some(Boolean)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }

                // Check for Text placeholder
                else if (node.nodeValue === '$text$') {
                    return NodeFilter.FILTER_ACCEPT;
                }

                return NodeFilter.FILTER_SKIP;
            },
        }
    );

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const path = getChildPathToAncesterNode(node, template.content);

        // Handle text placeholders
        if (node.nodeValue === '$text$') {
            partMeta.push({ type: 'text', path });
        } else if (
            node.nodeType === Node.ELEMENT_NODE &&
            (node as Element).hasAttributes()
        ) {
            // Check for attribute or event placeholders
            partMeta.push(
                ...Array.from((node as Element).attributes)
                    .map((attr): Attr => attr)
                    .filter(
                        (attr): boolean =>
                            attr.value === '<!--$attr$-->' ||
                            attr.value === '<!--$event$-->'
                    )
                    .map((attr): PartMeta => {
                        if (reIsEvent.test(attr.name)) {
                            (node as Element).removeAttribute(attr.name);
                            return {
                                type: 'event',
                                path,
                                event: attr.name.slice(2).toLowerCase(), // Remove the "on" prefix
                            };
                        } else {
                            return { type: 'attr', path, attr: attr.name };
                        }
                    })
            );
        }
    }

    return {
        template,
        partMeta,
    };
};

type NodeInstance = {
    parent: Node;
    nodes: Node[];
    parts: Part[];
};

const createNodeInstance = (templateResult: TemplateResult): NodeInstance => {
    const parts: Part[] = [];
    const { template, partMeta, substitutions } = templateResult;
    const fragmentRoot = template.content.cloneNode(true);

    partMeta.forEach((meta, index): void => {
        const substitution = substitutions[index];
        const node = getNodeFromPathViaAncesterNode(meta.path, fragmentRoot);
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
                console.log('event', debugNode(node));
                break;
            }

            case 'text': {
                const text = document.createTextNode(String(substitution));
                node.parentNode?.replaceChild(text, node);
                parts.push({ type: 'text', node: text });
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

export type TemplateResult = Readonly<TemplateCacheEntry> & {
    readonly substitutions: unknown[];
};

export const html = (
    template: TemplateStringsArray,
    ...substitutions: unknown[]
): TemplateResult => {
    if (!templateCache.has(template)) {
        templateCache.set(template, createTempleCacheEntry(template));
    }
    const cacheEntry = templateCache.get(template)!;
    return {
        template: cacheEntry.template,
        partMeta: cacheEntry.partMeta,
        substitutions,
    };
};

const nodeInstanceCache = new WeakMap<Node, NodeInstance>();

/**
 * Render the html template to a HTML Node
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
            const substition = templateResult.substitutions[index];
            switch (part.type) {
                case 'attr': {
                    part.node.setAttribute(part.attr, String(substition));
                    break;
                }

                case 'event': {
                    break;
                }

                case 'text': {
                    part.node.textContent = String(substition);
                    break;
                }
            }
        });
    }
};

/**
 * Render the HTML template to a string, useful for static site...
 *
 * @returns {string} The rendered HTML
 */
export const renderToString = (): string => '';

/**
 * Temporary debug helper to render information about the node
 * @param {Node} node The node to debug
 * @returns {string} The node debug info
 */
const debugNode = (node: Node): string =>
    `(${node.nodeType}) ${node.nodeName} => ${node.nodeValue}`;
