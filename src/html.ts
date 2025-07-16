type PartMeta = {
    readonly type: 'text' | 'attr' | 'event';
    readonly attr?: string;
    readonly event?: string;
    readonly substitutionIndex: number;
    readonly substitutionPlaceholder: string;
};

type TemplateCacheEntry = {
    readonly partMeta: PartMeta[];
    readonly templateStrings: TemplateStringsArray;
    readonly templateWithPlaceholders: string;
};

const templateCache = new WeakMap<TemplateStringsArray, TemplateCacheEntry>();

const createTemplateCacheEntry = (
    templateStrings: TemplateStringsArray
): TemplateCacheEntry => {
    /*
     * Parse templates
     *
     * Find substitution holes and mark each as a placeholder
     */
    const htmlChunks: string[] = [];
    const partMeta: PartMeta[] = [];
    const reIsAttribute = /([^\s=>\/]+)\s*=\s*(['"])?[^'"]*$/;
    const reIsEvent = /^on\w+$/i;
    templateStrings.forEach((templateItem, index): void => {
        let substitutionPlaceholder = '';
        htmlChunks.push(templateItem);
        if (index < templateStrings.length - 1) {
            const attributeMatch = templateItem.match(reIsAttribute);
            if (attributeMatch) {
                const attrName = attributeMatch[1];
                if (reIsEvent.test(attrName)) {
                    substitutionPlaceholder = `<!--$event-${index}$-->`;
                    partMeta.push({
                        type: 'event',
                        event: attrName.slice(2).toLowerCase(), // Remove the "on" prefix
                        substitutionPlaceholder,
                        substitutionIndex: index,
                    });
                } else {
                    substitutionPlaceholder = `<!--$attr-${index}$-->`;
                    partMeta.push({
                        type: 'attr',
                        attr: attrName,
                        substitutionPlaceholder,
                        substitutionIndex: index,
                    });
                }
            } else {
                // The part must be a text node
                substitutionPlaceholder = `<!--$text-${index}$-->`;
                partMeta.push({
                    type: 'text',
                    substitutionPlaceholder,
                    substitutionIndex: index,
                });
            }
            htmlChunks.push(substitutionPlaceholder);
        }
    });

    return {
        partMeta,
        templateStrings,
        templateWithPlaceholders: htmlChunks.join(''),
    };
};

const isPartMeta = (input: unknown): input is PartMeta => {
    if (typeof input !== 'object' || input === null) {
        return false;
    }

    if (!('type' in input)) {
        return false;
    }

    if (
        input.type !== 'text' &&
        input.type !== 'attr' &&
        input.type !== 'event'
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
        'substitutionIndex' in input &&
        typeof input.substitutionIndex !== 'number'
    ) {
        return false;
    }

    if (
        'substitutionPlaceholder' in input &&
        typeof input.substitutionPlaceholder !== 'string'
    ) {
        return false;
    }

    return true;
};

const isTemplateCacheEntry = (input: unknown): input is TemplateCacheEntry => {
    return (
        typeof input === 'object' &&
        input !== null &&
        'partMeta' in input &&
        Array.isArray(input.partMeta) &&
        input.partMeta.every(isPartMeta) &&
        'templateStrings' in input &&
        Array.isArray(input.templateStrings) &&
        'raw' in input.templateStrings &&
        'templateWithPlaceholders' in input &&
        typeof input.templateWithPlaceholders === 'string'
    );
};

/**
 * The `TemplateResult`
 *
 * @property substitutions - The substitutions
 */
export type TemplateResult = Readonly<TemplateCacheEntry> & {
    readonly substitutions: ReadonlyArray<unknown>;
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
 * Parse the HTML template and substitutions, creating a template result enabling
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
        templateCache.set(template, createTemplateCacheEntry(template));
    }
    const cacheEntry = templateCache.get(template)!;
    return {
        partMeta: cacheEntry.partMeta,
        substitutions,
        templateStrings: cacheEntry.templateStrings,
        templateWithPlaceholders: cacheEntry.templateWithPlaceholders,
    };
};
