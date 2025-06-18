if (typeof Document === 'undefined') {
    await import('@src/server/shim/shim-dom.ts');
}
import { html, type TemplateResult } from '@src/html.ts';
import { renderToString } from '@src/renderToString.ts';
import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';

describe('renderToString', (): void => {
    it('can handle no substitution', (): void => {
        const template = (): TemplateResult => html`<p>hi</p>`;
        const actual = renderToString(template());
        assertEquals(actual, `<p>hi</p>`);
    });

    it('can handle no substitution with children', (): void => {
        const template = (): TemplateResult =>
            // prettier-ignore
            html`<article><h2>Hi</h2><p>Hello world</p></article>`;
        assertEquals(
            renderToString(template()),
            `<article><h2>Hi</h2><p>Hello world</p></article>`
        );
    });

    it('can handle single simple substitutions', (): void => {
        const template = (content: string): TemplateResult =>
            // prettier-ignore
            html`<p>${content}</p>`;
        assertEquals(renderToString(template('hi')), `<p>hi</p>`);
    });

    it('can handle multiple simple substitutions', (): void => {
        const template = (title: string, content: string): TemplateResult =>
            // prettier-ignore
            html`<article><h2>${title}</h2><p>${content}</p></article>`;
        assertEquals(
            renderToString(template('Hi', 'Hello world')),
            `<article><h2>Hi</h2><p>Hello world</p></article>`
        );
    });

    it('can handle multiple simple substitutions with complex parenthood', (): void => {
        const template = (content1: string, content2: string): TemplateResult =>
            // prettier-ignore
            html`<article>${content1}</article><article>${content2}</article>`;
        assertEquals(
            renderToString(template('A', 'B')),
            `<article>A</article><article>B</article>`
        );
    });

    it('can handle substitution update', (): void => {
        const template = (count: number): TemplateResult =>
            // prettier-ignore
            html`<div>${count}</div>`;
        assertEquals(renderToString(template(1)), '<div>1</div>');
        assertEquals(renderToString(template(2)), '<div>2</div>');
    });

    it('can handle attribute substitution', (): void => {
        const template = (count: number): TemplateResult =>
            // prettier-ignore
            html`<div id="${count}">hi</div>`;
        assertEquals(renderToString(template(1)), '<div id="1">hi</div>');
    });

    it('can handle data-attribute substitution', (): void => {
        const template = (count: number): TemplateResult =>
            // prettier-ignore
            html`<div data-id="${count}">hi</div>`;
        assertEquals(renderToString(template(1)), '<div data-id="1">hi</div>');
    });

    it('can handle event substitution', (): void => {
        const template = (f: () => void): TemplateResult =>
            // prettier-ignore
            html`<button onclick="${f}">Hi</button>`;
        const eventHandler = (): void => {};
        assertEquals(
            renderToString(template(eventHandler)),
            '<button>Hi</button>'
        );
    });

    it('can handle updating event substitution', (): void => {
        const template = (f: () => void): TemplateResult =>
            // prettier-ignore
            html`<button onclick="${f}">Hi</button>`;
        const eventHandler = (): void => {};
        assertEquals(
            renderToString(template(eventHandler)),
            '<button>Hi</button>'
        );
    });

    it('can handle substitution rendering single nested template part', (): void => {
        const template = (title: string): TemplateResult => {
            const header = html`<h1>${title}</h1>`;
            // prettier-ignore
            return html`${header}<p>content</p>`;
        };
        // First render, i.e. first time rendering
        assertEquals(
            renderToString(template('hello world')),
            `<h1>hello world</h1><p>content</p>`
        );
        // Render update
        assertEquals(
            renderToString(template('hi there')),
            `<h1>hi there</h1><p>content</p>`
        );
    });

    it('can handle substitution rendering multiple nested template parts', (): void => {
        const template = (title: string, footer: string): TemplateResult => {
            const header = html`<h1>${title}</h1>`;
            // prettier-ignore
            const content = html`${header}<p>content</p>`;
            // prettier-ignore
            return html`${content}<div>${footer}</div>`;
        };
        assertEquals(
            renderToString(template('1', '2')),
            `<h1>1</h1><p>content</p><div>2</div>`
        );
        // Render update
        assertEquals(
            renderToString(template('1', '3')),
            `<h1>1</h1><p>content</p><div>3</div>`
        );
    });

    it('can handle substitution rendering single nested template part where child has one attribute', (): void => {
        const template = (title: string, attr: string): TemplateResult => {
            const header = html`<h1>${title}</h1>`;
            // prettier-ignore
            return html`${header}<p id="${attr}">content</p>`;
        };
        // First render, i.e. first time rendering
        assertEquals(
            renderToString(template('1', 'a1')),
            `<h1>1</h1><p id="a1">content</p>`
        );
        // Render update
        assertEquals(
            renderToString(template('2', 'a2')),
            `<h1>2</h1><p id="a2">content</p>`
        );
    });
});
