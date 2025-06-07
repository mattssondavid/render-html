import '@src/server/shim/shim-dom.ts';
import { html } from '@src/html.ts';
import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';

describe('html tagged template literal node', (): void => {
    // it('can handle no substition', (): void => {
    //     // Simple
    //     const simpleTemplate = () => html`<p>hi</p>`;
    //     assertEquals((simpleTemplate() as HTMLElement).outerHTML, `<p>hi</p>`);

    //     // With children
    //     const moreComplexTemplate = () =>
    //         html`<article><h2>Hi</h2><p>Hello world</p></article>`;
    //     assertEquals(
    //         (moreComplexTemplate() as HTMLElement).outerHTML,
    //         `<article><h2>Hi</h2><p>Hello world</p></article>`
    //     );
    // });

    it('can handle simple substitutions', (): void => {
        // Single substitution
        // const singleSubtitutionTemplate = (content: string) =>
        //     html`<p>${content}</p>`;
        // assertEquals(
        //     (singleSubtitutionTemplate('hi') as HTMLElement).outerHTML,
        //     `<p>hi</p>`
        // );

        const multipleSubstitutionsTemplate = (
            title: string,
            content: string
        ) =>
            html`<article>
                <h2>${title}</h2>
                <p>${content}</p>
            </article>`;
        assertEquals(
            (multipleSubstitutionsTemplate('Hi', 'Hello world') as HTMLElement)
                .outerHTML,
            `<article><h2>Hi</h2><p>Hello world</p></article>`
        );

        const complexParenthoodTemplate = (
            content1: string,
            content2: string
        ) =>
            html`<article>${content1}</article>
                <article>${content2}</article>`;
        assertEquals(
            (complexParenthoodTemplate('A', 'B') as HTMLElement).outerHTML,
            `<article>A</article><article>B</article>`
        );
    });

    // it('can handle substition update', (): void => {
    //     const template = (count: number) => html`<div>${count}</div>`;
    //     assertEquals((template(1) as HTMLElement).outerHTML, '<div>1</div>');
    //     assertEquals((template(2) as HTMLElement).outerHTML, '<div>2</div>');
    // });

    it('can handle attribute substitution', (): void => {
        const simpleAttributetemplate = (count: number) =>
            html`<div id="${count}">hi</div>`;
        assertEquals(
            (simpleAttributetemplate(1) as HTMLElement).outerHTML,
            '<div id="1">hi</div>'
        );

        const dataAttributetemplate = (count: number) =>
            html`<div data-id="${count}">hi</div>`;
        assertEquals(
            (dataAttributetemplate(2) as HTMLElement).outerHTML,
            '<div data-id="1">hi</div>'
        );
    });

    // it('can handle event', (): void => {
    //     const template = (f: () => void) =>
    //         html`<button onclick="${f}">Hi</button>`;
    //     let counter = 0;
    //     const eventHandler = (): void => {
    //         counter += 1;
    //     };
    //     const node1 = template(eventHandler);
    //     (node1 as HTMLElement).querySelector('button')?.click();
    //     assertEquals(counter, 1);
    //     const node2 = template(eventHandler);
    //     (node2 as HTMLElement).querySelector('button')?.click();
    //     assertEquals(counter, 2);
    // });

    // it('can handle rendering template parts', (): void => {
    //     const title = 'hello world';
    //     const header = html`<h1>${title}</h1>`;
    //     const content = html`${header}<p>content</p>`;
    //     assertEquals(
    //         (content as HTMLElement).outerHTML,
    //         `<h1>${title}</h1><p>content</p>`
    //     );
    // });
});
