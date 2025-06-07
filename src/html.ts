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

import { getChildPathToAncesterNode } from './util/node/getChildPathToAncesterNode.ts';

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
