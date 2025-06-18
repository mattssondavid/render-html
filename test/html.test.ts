if (typeof Document === 'undefined') {
    await import('@src/server/shim/shim-dom.ts');
}
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
            actual.template.innerHTML,
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
            actual.template.innerHTML,
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
            [{ path: [0, 0], type: 'text' }],
            'partMeta mismatch'
        );
        assertEquals(actual.substitutions, ['hi'], 'substitutions mismatch');
        assertEquals(
            actual.template.innerHTML,
            '<p><!--$text$--></p>',
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
                { path: [0, 0, 0], type: 'text' },
                { path: [0, 1, 0], type: 'text' },
            ],
            'partMeta mismatch'
        );
        assertEquals(
            actual.substitutions,
            ['hi', 'Hello world'],
            'substitutions mismatch'
        );
        assertEquals(
            actual.template.innerHTML,
            '<article><h2><!--$text$--></h2><p><!--$text$--></p></article>',
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
                { path: [0, 0], type: 'text' },
                { path: [1, 0], type: 'text' },
            ],
            'partMeta mismatch'
        );
        assertEquals(
            actual.substitutions,
            ['hi', 'Hello world'],
            'substitutions mismatch'
        );
        assertEquals(
            actual.template.innerHTML,
            '<article><!--$text$--></article><article><!--$text$--></article>',
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
            [{ path: [0, 0], type: 'text' }],
            'partMeta mismatch for actualOne'
        );
        assertEquals(
            actualOne.substitutions,
            [1],
            'substitutions mismatch for actualOne'
        );
        assertEquals(
            actualOne.template.innerHTML,
            '<div><!--$text$--></div>',
            'template mismatch for actualOne'
        );

        const actualTwo = template(2);
        assertEquals(
            actualTwo.partMeta,
            [{ path: [0, 0], type: 'text' }],
            'partMeta mismatch for actualTwo'
        );
        assertEquals(
            actualTwo.substitutions,
            [2],
            'substitutions mismatch for actualTwo'
        );
        assertEquals(
            actualTwo.template.innerHTML,
            '<div><!--$text$--></div>',
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
            [{ attr: 'id', path: [0], type: 'attr' }],
            'partMeta mismatch'
        );
        assertEquals(actual.substitutions, [1], 'substitutions mismatch');
        assertEquals(
            actual.template.innerHTML,
            '<div id="<!--$attr$-->">hi</div>',
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
            [{ attr: 'data-id', path: [0], type: 'attr' }],
            'partMeta mismatch'
        );
        assertEquals(actual.substitutions, [1], 'substitutions mismatch');
        assertEquals(
            actual.template.innerHTML,
            '<div data-id="<!--$attr$-->">hi</div>',
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
            [{ event: 'click', path: [0], type: 'event' }],
            'partMeta mismatch'
        );
        assertEquals(
            actual.substitutions,
            [eventHandler],
            'substitutions mismatch'
        );
        assertEquals(
            actual.template.innerHTML,
            '<button>Hi</button>',
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
            [{ event: 'click', path: [0], type: 'event' }],
            'partMeta mismatch for actualOne'
        );
        assertEquals(
            actualOne.substitutions,
            [eventHandler],
            'substitutions mismatch for actualOne'
        );
        assertEquals(
            actualOne.template.innerHTML,
            '<button>Hi</button>',
            'template mismatch for actualOne'
        );

        const actualTwo = template(eventHandler);
        assertEquals(
            actualTwo.partMeta,
            [{ event: 'click', path: [0], type: 'event' }],
            'partMeta mismatch for actualTwo'
        );
        assertEquals(
            actualTwo.substitutions,
            [eventHandler],
            'substitutions mismatch for actualTwo'
        );
        assertEquals(
            actualTwo.template.innerHTML,
            '<button>Hi</button>',
            'template mismatch for actualTwo'
        );

        const eventHandlerThree = {
            handleEvent: (): void => {},
        };
        // @ts-ignore Fix type later
        const actualThree = template(eventHandlerThree);
        assertEquals(
            actualThree.partMeta,
            [{ event: 'click', path: [0], type: 'event' }],
            'partMeta mismatch for actualThree'
        );
        assertEquals(
            actualThree.substitutions,
            [eventHandlerThree],
            'substitutions mismatch for actualThree'
        );
        assertEquals(
            actualThree.template.innerHTML,
            '<button>Hi</button>',
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
            [{ path: [0], type: 'text' }],
            'partMeta mismatch for actualOne'
        );
        // ToDo fix this assert
        // assertEquals(
        //     actualOne.substitutions,
        //     [
        //         {
        //             partMeta: [{ path: [0, 0], type: 'text' }],
        //             substitutions: ['hello world'],
        //             template: new HTMLTemplateElement(),
        //         },
        //     ],
        //     'substitutions mismatch for actualOne'
        // );
        assertEquals(
            actualOne.template.innerHTML,
            '<!--$text$--><p>content</p>',
            'template mismatch for actualOne'
        );

        const actualTwo = template('hi there');
        assertEquals(
            actualTwo.partMeta,
            [{ path: [0], type: 'text' }],
            'partMeta mismatch for actualTwo'
        );
        // ToDo fix this assert
        // assertEquals(
        //     actualTwo.substitutions,
        //     [
        //         {
        //             partMeta: [{ path: [0, 0], type: 'text' }],
        //             substitutions: ['hi there'],
        //             template: new HTMLTemplateElement(),
        //         },
        //     ],
        //     'substitutions mismatch for actualTwo'
        // );
        assertEquals(
            actualTwo.template.innerHTML,
            '<!--$text$--><p>content</p>',
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
                { path: [0], type: 'text' },
                { attr: 'id', path: [1], type: 'attr' },
            ],
            'partMeta mismatch'
        );
        // ToDo fix this assert
        // assertEquals(actual.substitutions, [1, 'a1'], 'substitutions mismatch');
        assertEquals(
            actual.template.innerHTML,
            '<!--$text$--><p id="<!--$attr$-->">content</p>',
            'template mismatch'
        );
    });
});
