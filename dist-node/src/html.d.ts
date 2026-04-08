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
export type TemplateResult = TemplateCacheEntry & {
    readonly substitutions: ReadonlyArray<unknown>;
};
export declare const isTemplateResult: (input: unknown) => input is TemplateResult;
export declare const html: (template: TemplateStringsArray, ...substitutions: unknown[]) => TemplateResult;
export {};
