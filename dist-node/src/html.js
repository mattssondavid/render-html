const templateCache = new WeakMap();
const createTemplateCacheEntry = (templateStrings) => {
    const htmlChunks = [];
    const partMeta = [];
    const reIsAttribute = /([^\s=>\/]+)\s*=\s*(['"])?[^'"]*$/;
    const reIsEvent = /^on\w+$/i;
    templateStrings.forEach((templateItem, index) => {
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
                        event: attrName.slice(2).toLowerCase(),
                        substitutionPlaceholder,
                        substitutionIndex: index,
                    });
                }
                else {
                    substitutionPlaceholder = `<!--$attr-${index}$-->`;
                    partMeta.push({
                        type: 'attr',
                        attr: attrName,
                        substitutionPlaceholder,
                        substitutionIndex: index,
                    });
                }
            }
            else {
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
const isPartMeta = (input) => {
    if (typeof input !== 'object' || input === null) {
        return false;
    }
    if (!('type' in input)) {
        return false;
    }
    if (input.type !== 'text' &&
        input.type !== 'attr' &&
        input.type !== 'event') {
        return false;
    }
    if ('attr' in input && typeof input.attr !== 'string') {
        return false;
    }
    if ('event' in input && typeof input.event !== 'string') {
        return false;
    }
    if ('substitutionIndex' in input &&
        typeof input.substitutionIndex !== 'number') {
        return false;
    }
    if ('substitutionPlaceholder' in input &&
        typeof input.substitutionPlaceholder !== 'string') {
        return false;
    }
    return true;
};
const isTemplateCacheEntry = (input) => {
    return (typeof input === 'object' &&
        input !== null &&
        'partMeta' in input &&
        Array.isArray(input.partMeta) &&
        input.partMeta.every(isPartMeta) &&
        'templateStrings' in input &&
        Array.isArray(input.templateStrings) &&
        'raw' in input.templateStrings &&
        'templateWithPlaceholders' in input &&
        typeof input.templateWithPlaceholders === 'string');
};
export const isTemplateResult = (input) => {
    return (typeof input === 'object' &&
        input !== null &&
        isTemplateCacheEntry(input) &&
        'substitutions' in input &&
        Array.isArray(input.substitutions));
};
export const html = (template, ...substitutions) => {
    if (!templateCache.has(template)) {
        templateCache.set(template, createTemplateCacheEntry(template));
    }
    const cacheEntry = templateCache.get(template);
    return {
        partMeta: cacheEntry.partMeta,
        substitutions,
        templateStrings: cacheEntry.templateStrings,
        templateWithPlaceholders: cacheEntry.templateWithPlaceholders,
    };
};
