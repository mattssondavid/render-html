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

// type Part = {
//     node: Node;
//     type: 'text' | 'attr' | 'event';
//     name?: string;
//     value?: string;
//     substitutionMarker?: string;
// };
type Part =
    | { type: 'text'; node: Text }
    | {
          type: 'attr';
          node: Element;
          attr: string;
          value: string;
          substitutionMarker: string;
      }
    | {
          type: 'event';
          node: Element;
          event: string;
          value: string;
          substitutionMarker: string;
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

    console.log(`HTML with placeholders:\n${html}`);

    /*
     * Find all substitution placeholders
     */
    const partMeta: PartMeta[] = [];

    const walker = document.createTreeWalker(
        template.content,
        NodeFilter.SHOW_COMMENT,
        {
            acceptNode: (node): Node['ELEMENT_NODE'] | Node['TEXT_NODE'] => {
                // Only accept comments that are placeholders for substitutions
                return node.nodeValue === '$attr$' ||
                    node.nodeValue === '$event$' ||
                    node.nodeValue === '$text$'
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_SKIP;
            },
        }
    );

    while (walker.nextNode()) {
        const comment = walker.currentNode as Comment;

        console.log(comment);
        console.log(debugNode(comment));

        // Test to find "true" parent... maybe. From copilot
        console.log(comment.parentElement?.nodeName);
        let path: number[] = [];
        let n: Node | null = comment;
        while (n && n !== template.content) {
            const parent: ParentNode | null = n.parentNode;
            if (!parent) break;
            path.unshift(Array.prototype.indexOf.call(parent.childNodes, n));
            n = parent;
        }
        console.log('-----');
        console.log(path);
        console.log(n);
        console.log(n === comment.parentElement);
        console.log('-----');

        // comment.parentElement?.getAttributeNames().forEach((attr): void => {
        //     // Only accept placeholder attributes
        //     const attributeValue = comment.parentElement?.getAttribute(attr);
        //     if (
        //         attributeValue !== null &&
        //         (attributeValue!.includes('<!--$event$-->') ||
        //             attributeValue!.includes('<!--$attr$-->'))
        //     ) {
        //         if (reIsEvent.test(attr)) {
        //             const event = attr.slice(2).toLowerCase(); // Remove "on" prefix
        //             parts.push({
        //                 node: comment.parentElement!,
        //                 type: 'event',
        //                 event,
        //                 value: attributeValue!,
        //                 substitutionMarker: '<!--$event$-->',
        //             });
        //         } else {
        //             parts.push({
        //                 node: comment.parentElement!,
        //                 type: 'attr',
        //                 attr,
        //                 value: attributeValue!,
        //                 substitutionMarker: '<!--$attr$-->',
        //             });
        //         }
        //         // Remove the placeholder attribute
        //         comment.parentElement!.removeAttribute(attr);
        //     }
        // });
        if (comment.nodeValue === '$text$') {
            partMeta.push({ type: 'text', path });
            // parts.push({ node: comment as Text, type: 'text' });
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

const debugNode = (node: Node): string =>
    `(${node.nodeType}) ${node.nodeName} => ${node.nodeValue}`;

const createNodeInstance = (
    templateStrings: TemplateStringsArray,
    substitutions: unknown[]
) => {
    if (!templateCache.has(templateStrings)) {
        templateCache.set(
            templateStrings,
            createTempleCacheEntry(templateStrings)
        );
    }
    const { template, partMeta } = templateCache.get(templateStrings)!;

    console.log(partMeta);
    const frag = template.content.cloneNode(true);
    console.log(frag.childNodes);

    const nodes = Array.from(frag.childNodes);

    console.log(nodes.map(debugNode));

    partMeta.forEach((meta, index): void => {
        console.log(meta);
        console.log(index);
    });

    const walker = document.createTreeWalker(
        frag,
        NodeFilter.SHOW_COMMENT,
        null
    );

    while (walker.nextNode()) {
        const node = walker.currentNode;
        console.log(debugNode(node));
    }
};

export const html = (
    template: TemplateStringsArray,
    ...substitutions: unknown[]
): Node => {
    createNodeInstance(template, substitutions);

    // const cachedTemplate = templateCache.get(template);
    // if (!cachedTemplate) {
    //     const cacheEntry = createTempleCacheEntry(template);

    //     /*
    //      * Replace placeholders with initial substitution values
    //      *
    //      * "Render"
    //      */
    //     cacheEntry.parts.forEach((part: Part, index: number): void => {
    //         const substitution = substitutions[index];

    //         switch (part.type) {
    //             case 'attr': {
    //                 part.node.parentElement?.setAttribute(
    //                     part.attr!,
    //                     part.value!.replace(
    //                         part.substitutionMarker!,
    //                         String(substitution)
    //                     )
    //                 );

    //                 console.log(substitution);
    //                 console.log(part);

    //                 break;
    //             }

    //             case 'event': {
    //                 // The event listener can be specified as either a callback
    //                 // function or an object whose handleEvent() method serves
    //                 // as the callback function. For now, just leave it as an
    //                 // attribute.

    //                 part.node.parentElement?.setAttribute(
    //                     `on${part.event!}`,
    //                     part.value!.replace(
    //                         part.substitutionMarker!,
    //                         String(substitution)
    //                     )
    //                 );

    //                 console.log(substitution);
    //                 console.log(part);

    //                 break;
    //             }

    //             case 'text': {
    //                 const text = document.createTextNode(String(substitution));
    //                 cacheEntry.parts
    //                     .filter((item): boolean => item.node === part.node)
    //                     .forEach((item): void => {
    //                         item.node.parentNode?.replaceChild(text, part.node);
    //                         item.node = text;
    //                     });

    //                 // part.node.parentNode?.replaceChild(text, part.node);
    //                 // part.node = text;

    //                 break;
    //             }

    //             default: {
    //                 // Do nothing
    //                 break;
    //             }
    //         }
    //     });

    //     templateCache.set(template, cacheEntry);
    //     return cacheEntry.template.content.cloneNode(true);
    // } else {
    //     /*
    //      * Update dynamic parts in place
    //      */
    //     cachedTemplate.parts.forEach((part: Part, index: number): void => {
    //         const substitution = substitutions[index];

    //         switch (part.type) {
    //             case 'attr': {
    //                 part.node.parentElement?.setAttribute(
    //                     part.attr!,
    //                     part.value!.replace(
    //                         part.substitutionMarker!,
    //                         String(substitution)
    //                     )
    //                 );

    //                 break;
    //             }

    //             case 'event': {
    //                 part.node.parentElement?.setAttribute(
    //                     `on${part.event!}`,
    //                     part.value!.replace(
    //                         part.substitutionMarker!,
    //                         String(substitution)
    //                     )
    //                 );

    //                 break;
    //             }

    //             case 'text': {
    //                 (part.node as Text).textContent = String(substitution);

    //                 break;
    //             }

    //             default: {
    //                 // Do nothing
    //                 break;
    //             }
    //         }
    //     });

    // return cachedTemplate.template.content.cloneNode(true);
    // }
    return document.createElement('div');
};

const containerCache = new WeakMap<Node, NodeInstance>();

/**
 * Render the html template to a HTML Node
 *
 * @returns
 */
export const render =
    (): // templateCacheWithSubstitutions: CacheEntry & { substitutions: unknown[] },
    // container: Node
    void => {
        // const containerInstance = containerCache.get(container);
        // if (!containerInstance) {
        // } else {
        // }
    };

/**
 * Render the HTML template to a string, useful for static site...
 *
 * @returns
 */
export const renderToString = (): string => '';
