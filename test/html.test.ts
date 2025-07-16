import { html, type TemplateResult } from '@src/html.ts';
import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';

describe('html', (): void => {
    it('can handle no substitution', (): void => {
        const template = (): TemplateResult => html`<p>hi</p>`;
        const actual = template();
        assertEquals(actual.partMeta, [], 'partMeta mismatch');
        assertEquals(actual.substitutions, [], 'substitutions mismatch');
        assertEquals(
            actual.templateWithPlaceholders,
            `<p>hi</p>`,
            'template mismatch'
        );
    });

    it('can handle no substitution with children', (): void => {
        const template = (): TemplateResult =>
            // prettier-ignore
            html`<article><h2>Hi</h2><p>Hello world</p></article>`;
        const actual = template();
        assertEquals(actual.partMeta, [], 'partMeta mismatch');
        assertEquals(actual.substitutions, [], 'substitutions mismatch');
        assertEquals(
            actual.templateWithPlaceholders,
            `<article><h2>Hi</h2><p>Hello world</p></article>`,
            'template mismatch'
        );
    });

    it('can handle single simple substitutions', (): void => {
        const template = (content: string): TemplateResult =>
            // prettier-ignore
            html`<p>${content}</p>`;
        const actual = template('hi');
        assertEquals(
            actual.partMeta,
            [
                {
                    type: 'text',
                    substitutionPlaceholder: '<!--$text-0$-->',
                    substitutionIndex: 0,
                },
            ],
            'partMeta mismatch'
        );
        assertEquals(actual.substitutions, ['hi'], 'substitutions mismatch');
        assertEquals(
            actual.templateWithPlaceholders,
            '<p><!--$text-0$--></p>',
            'template mismatch'
        );
    });

    it('can handle multiple simple substitutions', (): void => {
        const template = (title: string, content: string): TemplateResult =>
            // prettier-ignore
            html`<article><h2>${title}</h2><p>${content}</p></article>`;
        const actual = template('hi', 'Hello world');
        assertEquals(
            actual.partMeta,
            [
                {
                    type: 'text',
                    substitutionPlaceholder: '<!--$text-0$-->',
                    substitutionIndex: 0,
                },
                {
                    type: 'text',
                    substitutionPlaceholder: '<!--$text-1$-->',
                    substitutionIndex: 1,
                },
            ],
            'partMeta mismatch'
        );
        assertEquals(
            actual.substitutions,
            ['hi', 'Hello world'],
            'substitutions mismatch'
        );
        assertEquals(
            actual.templateWithPlaceholders,
            '<article><h2><!--$text-0$--></h2><p><!--$text-1$--></p></article>',
            'template mismatch'
        );
    });

    it('can handle multiple simple substitutions with complex parenthood', (): void => {
        const template = (content1: string, content2: string): TemplateResult =>
            // prettier-ignore
            html`<article>${content1}</article><article>${content2}</article>`;
        const actual = template('hi', 'Hello world');
        assertEquals(
            actual.partMeta,
            [
                {
                    type: 'text',
                    substitutionPlaceholder: '<!--$text-0$-->',
                    substitutionIndex: 0,
                },
                {
                    type: 'text',
                    substitutionPlaceholder: '<!--$text-1$-->',
                    substitutionIndex: 1,
                },
            ],
            'partMeta mismatch'
        );
        assertEquals(
            actual.substitutions,
            ['hi', 'Hello world'],
            'substitutions mismatch'
        );
        assertEquals(
            actual.templateWithPlaceholders,
            '<article><!--$text-0$--></article><article><!--$text-1$--></article>',
            'template mismatch'
        );
    });

    it('can handle substitution update', (): void => {
        const template = (count: number): TemplateResult =>
            // prettier-ignore
            html`<div>${count}</div>`;
        const actualOne = template(1);
        assertEquals(
            actualOne.partMeta,
            [
                {
                    type: 'text',
                    substitutionPlaceholder: '<!--$text-0$-->',
                    substitutionIndex: 0,
                },
            ],
            'partMeta mismatch for actualOne'
        );
        assertEquals(
            actualOne.substitutions,
            [1],
            'substitutions mismatch for actualOne'
        );
        assertEquals(
            actualOne.templateWithPlaceholders,
            '<div><!--$text-0$--></div>',
            'template mismatch for actualOne'
        );

        const actualTwo = template(2);
        assertEquals(
            actualTwo.partMeta,
            [
                {
                    type: 'text',
                    substitutionPlaceholder: '<!--$text-0$-->',
                    substitutionIndex: 0,
                },
            ],
            'partMeta mismatch for actualTwo'
        );
        assertEquals(
            actualTwo.substitutions,
            [2],
            'substitutions mismatch for actualTwo'
        );
        assertEquals(
            actualTwo.templateWithPlaceholders,
            '<div><!--$text-0$--></div>',
            'template mismatch for actualTwo'
        );
    });

    it('can handle attribute substitution', (): void => {
        const template = (count: number): TemplateResult =>
            // prettier-ignore
            html`<div id="${count}">hi</div>`;
        const actual = template(1);
        assertEquals(
            actual.partMeta,
            [
                {
                    type: 'attr',
                    attr: 'id',
                    substitutionPlaceholder: '<!--$attr-0$-->',
                    substitutionIndex: 0,
                },
            ],
            'partMeta mismatch'
        );
        assertEquals(actual.substitutions, [1], 'substitutions mismatch');
        assertEquals(
            actual.templateWithPlaceholders,
            '<div id="<!--$attr-0$-->">hi</div>',
            'template mismatch'
        );
    });

    it('can handle data-attribute substitution', (): void => {
        const template = (count: number): TemplateResult =>
            // prettier-ignore
            html`<div data-id="${count}">hi</div>`;
        const actual = template(1);
        assertEquals(
            actual.partMeta,
            [
                {
                    type: 'attr',
                    attr: 'data-id',
                    substitutionPlaceholder: '<!--$attr-0$-->',
                    substitutionIndex: 0,
                },
            ],
            'partMeta mismatch'
        );
        assertEquals(actual.substitutions, [1], 'substitutions mismatch');
        assertEquals(
            actual.templateWithPlaceholders,
            '<div data-id="<!--$attr-0$-->">hi</div>',
            'template mismatch'
        );
    });

    it('can handle event substitution', (): void => {
        const template = (f: () => void): TemplateResult =>
            // prettier-ignore
            html`<button onclick="${f}">Hi</button>`;
        const eventHandler = (): void => {};
        const actual = template(eventHandler);
        assertEquals(
            actual.partMeta,
            [
                {
                    event: 'click',
                    substitutionPlaceholder: '<!--$event-0$-->',
                    substitutionIndex: 0,
                    type: 'event',
                },
            ],
            'partMeta mismatch'
        );
        assertEquals(
            actual.substitutions,
            [eventHandler],
            'substitutions mismatch'
        );
        assertEquals(
            actual.templateWithPlaceholders,
            '<button onclick="<!--$event-0$-->">Hi</button>',
            'template mismatch'
        );
    });

    it('can handle updating event substitution', (): void => {
        const template = (
            f: () => void | { handleEvent: () => void }
        ): TemplateResult =>
            // prettier-ignore
            html`<button onclick="${f}">Hi</button>`;
        const eventHandler = (): void => {};
        const actualOne = template(eventHandler);
        assertEquals(
            actualOne.partMeta,
            [
                {
                    event: 'click',
                    substitutionPlaceholder: '<!--$event-0$-->',
                    substitutionIndex: 0,
                    type: 'event',
                },
            ],
            'partMeta mismatch for actualOne'
        );
        assertEquals(
            actualOne.substitutions,
            [eventHandler],
            'substitutions mismatch for actualOne'
        );
        assertEquals(
            actualOne.templateWithPlaceholders,
            '<button onclick="<!--$event-0$-->">Hi</button>',
            'template mismatch for actualOne'
        );
        const actualTwo = template(eventHandler);
        assertEquals(
            actualTwo.partMeta,
            [
                {
                    event: 'click',
                    substitutionPlaceholder: '<!--$event-0$-->',
                    substitutionIndex: 0,
                    type: 'event',
                },
            ],
            'partMeta mismatch for actualTwo'
        );
        assertEquals(
            actualTwo.substitutions,
            [eventHandler],
            'substitutions mismatch for actualTwo'
        );
        assertEquals(
            actualTwo.templateWithPlaceholders,
            '<button onclick="<!--$event-0$-->">Hi</button>',
            'template mismatch for actualTwo'
        );
        const eventHandlerThree = {
            handleEvent: (): void => {},
        };
        // @ts-ignore Fix type later
        const actualThree = template(eventHandlerThree);
        assertEquals(
            actualThree.partMeta,
            [
                {
                    event: 'click',
                    substitutionPlaceholder: '<!--$event-0$-->',
                    substitutionIndex: 0,
                    type: 'event',
                },
            ],
            'partMeta mismatch for actualThree'
        );
        assertEquals(
            actualThree.substitutions,
            [eventHandlerThree],
            'substitutions mismatch for actualThree'
        );
        assertEquals(
            actualThree.templateWithPlaceholders,
            '<button onclick="<!--$event-0$-->">Hi</button>',
            'template mismatch for actualThree'
        );
    });

    it('can handle substitution rendering single nested template part', (): void => {
        const template = (title: string): TemplateResult => {
            const header = html`<h1>${title}</h1>`;
            // prettier-ignore
            return html`${header}<p>content</p>`;
        };
        const actualOne = template('hello world');
        assertEquals(
            actualOne.partMeta,
            [
                {
                    type: 'text',
                    substitutionPlaceholder: '<!--$text-0$-->',
                    substitutionIndex: 0,
                },
            ],
            'partMeta mismatch for actualOne'
        );
        assertEquals(
            actualOne.substitutions,
            [
                {
                    partMeta: [
                        {
                            type: 'text',
                            substitutionPlaceholder: '<!--$text-0$-->',
                            substitutionIndex: 0,
                        },
                    ],
                    substitutions: ['hello world'],
                    templateStrings: ['<h1>', '</h1>'],
                    templateWithPlaceholders: '<h1><!--$text-0$--></h1>',
                },
            ],
            'substitutions mismatch for actualOne'
        );
        assertEquals(
            actualOne.templateWithPlaceholders,
            '<!--$text-0$--><p>content</p>',
            'template mismatch for actualOne'
        );
        const actualTwo = template('hi there');
        assertEquals(
            actualTwo.partMeta,
            [
                {
                    type: 'text',
                    substitutionPlaceholder: '<!--$text-0$-->',
                    substitutionIndex: 0,
                },
            ],
            'partMeta mismatch for actualTwo'
        );
        assertEquals(
            actualTwo.substitutions,
            [
                {
                    partMeta: [
                        {
                            type: 'text',
                            substitutionPlaceholder: '<!--$text-0$-->',
                            substitutionIndex: 0,
                        },
                    ],
                    substitutions: ['hi there'],
                    templateStrings: ['<h1>', '</h1>'],
                    templateWithPlaceholders: '<h1><!--$text-0$--></h1>',
                },
            ],
            'substitutions mismatch for actualTwo'
        );
        assertEquals(
            actualTwo.templateWithPlaceholders,
            '<!--$text-0$--><p>content</p>',
            'template mismatch for actualTwo'
        );
    });

    it('can handle substitution rendering single nested template part where child has one attribute', (): void => {
        const template = (title: string, attr: string): TemplateResult => {
            const header = html`<h1>${title}</h1>`;
            // prettier-ignore
            return html`${header}<p id="${attr}">content</p>`;
        };
        const actual = template('1', 'a1');
        assertEquals(
            actual.partMeta,
            [
                {
                    type: 'text',
                    substitutionPlaceholder: '<!--$text-0$-->',
                    substitutionIndex: 0,
                },
                {
                    type: 'attr',
                    attr: 'id',
                    substitutionPlaceholder: '<!--$attr-1$-->',
                    substitutionIndex: 1,
                },
            ],
            'partMeta mismatch'
        );
        assertEquals(
            actual.substitutions,
            [
                {
                    partMeta: [
                        {
                            substitutionIndex: 0,
                            substitutionPlaceholder: '<!--$text-0$-->',
                            type: 'text',
                        },
                    ],
                    substitutions: ['1'],
                    templateStrings: ['<h1>', '</h1>'],
                    templateWithPlaceholders: '<h1><!--$text-0$--></h1>',
                },

                'a1',
            ],
            'substitutions mismatch'
        );
        assertEquals(
            actual.templateWithPlaceholders,
            '<!--$text-0$--><p id="<!--$attr-1$-->">content</p>',
            'template mismatch'
        );
    });

    it('can handle multiple lines', (): void => {
        const template = (lang: string, title: string): TemplateResult =>
            html`<!DOCTYPE html>
                <html lang="${lang}">
                    <head>
                        <meta
                            http-equiv="content-Type"
                            content="text/html; charset=UTF-8"
                        />
                        <meta
                            name="viewport"
                            content="width=device-width, initial-scale=1"
                        />
                        <title>${title}</title>
                    </head>
                    <body></body>
                </html>`;
        const actual = template('en', 'test');
        assertEquals(
            actual.partMeta,
            [
                {
                    attr: 'lang',
                    substitutionIndex: 0,
                    substitutionPlaceholder: '<!--$attr-0$-->',
                    type: 'attr',
                },
                {
                    substitutionIndex: 1,
                    substitutionPlaceholder: '<!--$text-1$-->',
                    type: 'text',
                },
            ],
            'partMeta mismatch'
        );
        assertEquals(
            actual.substitutions,
            ['en', 'test'],
            'substitutions mismatch'
        );
        assertEquals(
            actual.templateWithPlaceholders,
            `<!DOCTYPE html>
                <html lang="<!--$attr-0$-->">
                    <head>
                        <meta
                            http-equiv="content-Type"
                            content="text/html; charset=UTF-8"
                        />
                        <meta
                            name="viewport"
                            content="width=device-width, initial-scale=1"
                        />
                        <title><!--$text-1$--></title>
                    </head>
                    <body></body>
                </html>`,
            'template mismatch'
        );
    });
});
