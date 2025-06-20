if (typeof Document === 'undefined') {
    await import('./server/shim/shim-dom.ts');
}
import { getChildPathToAncesterNode } from './util/node/path/getChildPathToAncesterNode.ts';

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
            acceptNode: (node): number => {
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

const isPartMeta = (input: unknown): input is PartMeta => {
    if (typeof input !== 'object' || input === null) {
        return false;
    }

    if (!('type' in input) || !('path' in input)) {
        return false;
    }

    if (
        input.type !== 'text' &&
        input.type !== 'attr' &&
        input.type !== 'event'
    ) {
        return false;
    }

    if (
        !Array.isArray(input.path) ||
        !input.path.every((n): n is number => typeof n === 'number')
    ) {
        return false;
    }

    if ('attr' in input && typeof input.attr !== 'string') {
        return false;
    }

    if ('event' in input && typeof input.event !== 'string') {
        return false;
    }
    if (
        'lastEventListener' in input &&
        typeof input.lastEventListener !== 'undefined' &&
        (typeof input.lastEventListener !== 'object' ||
            input.lastEventListener === null)
    ) {
        return false;
    }

    return true;
};

const isTemplateCacheEntry = (input: unknown): input is TemplateCacheEntry => {
    return (
        typeof input === 'object' &&
        input !== null &&
        'template' in input &&
        input.template instanceof HTMLTemplateElement &&
        'partMeta' in input &&
        Array.isArray(input.partMeta) &&
        input.partMeta.every(isPartMeta)
    );
};

/**
 * The `TemplateResult`
 *
 * @property substitutions - The substitutions
 */
export type TemplateResult = Readonly<TemplateCacheEntry> & {
    readonly substitutions: unknown[];
};

/**
 * Check if the input is a TemplateResult
 *
 * @param {any} input - The value to check
 * @returns {boolean} True if and only if the input _is_ a `TemplateResult`
 */
export const isTemplateResult = (input: unknown): input is TemplateResult => {
    return (
        typeof input === 'object' &&
        input !== null &&
        isTemplateCacheEntry(input) &&
        'substitutions' in input &&
        Array.isArray(input.substitutions)
    );
};

/**
 * Parse the HTML template and substitutions, creating a template result to have
 * efficient DOM manipulation by only updating bits (substitutions) that needs
 * to be updated via a `render` function by using a "dirty check" rendering
 * approach for DOM manipulation.
 *
 * @param {TemplateStringsArray} template - The template to parse
 * @param {unknown[]} substitutions - The substitutions
 * @returns {TemplateResult} the created Template Result
 */
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
