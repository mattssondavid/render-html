import { html, type TemplateResult } from '@src/html.ts';
import { render } from '@src/render.ts';
import '@src/server/shim/shim-dom.ts';
import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';

describe('render', (): void => {
    let container: HTMLElement;

    beforeEach((): void => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach((): void => {
        if (container) {
            document.body.removeChild(container);
        }
    });

    it('can handle no substitution', (): void => {
        const template = (): TemplateResult => html`<p>hi</p>`;
        render(template(), container);
        assertEquals(container.innerHTML, `<p>hi</p>`);
    });

    it('can handle no substitution with children', (): void => {
        const template = (): TemplateResult =>
            // prettier-ignore
            html`<article><h2>Hi</h2><p>Hello world</p></article>`;
        render(template(), container);
        assertEquals(
            container.innerHTML,
            `<article><h2>Hi</h2><p>Hello world</p></article>`
        );
    });

    it('can handle single simple substitutions', (): void => {
        const template = (content: string): TemplateResult =>
            // prettier-ignore
            html`<p>${content}</p>`;
        render(template('hi'), container);
        assertEquals(container.innerHTML, `<p>hi</p>`);
    });

    it('can handle multiple simple substitutions', (): void => {
        const template = (title: string, content: string): TemplateResult =>
            // prettier-ignore
            html`<article><h2>${title}</h2><p>${content}</p></article>`;
        render(template('Hi', 'Hello world'), container);
        assertEquals(
            container.innerHTML,
            `<article><h2>Hi</h2><p>Hello world</p></article>`
        );
    });

    it('can handle multiple simple substitutions with complex parenthood', (): void => {
        const template = (content1: string, content2: string): TemplateResult =>
            // prettier-ignore
            html`<article>${content1}</article><article>${content2}</article>`;
        render(template('A', 'B'), container);
        assertEquals(
            container.innerHTML,
            `<article>A</article><article>B</article>`
        );
    });

    it('can handle substitution update', (): void => {
        const template = (count: number): TemplateResult =>
            // prettier-ignore
            html`<div>${count}</div>`;
        render(template(1), container);
        assertEquals(container.innerHTML, '<div>1</div>');
        render(template(2), container);
        assertEquals(container.innerHTML, '<div>2</div>');
    });

    it('can handle attribute substitution', (): void => {
        const template = (count: number): TemplateResult =>
            // prettier-ignore
            html`<div id="${count}">hi</div>`;
        render(template(1), container);
        assertEquals(container.innerHTML, '<div id="1">hi</div>');
    });

    it('can handle data-attribute substitution', (): void => {
        const template = (count: number): TemplateResult =>
            // prettier-ignore
            html`<div data-id="${count}">hi</div>`;
        render(template(1), container);
        assertEquals(container.innerHTML, '<div data-id="1">hi</div>');
    });

    it('can handle event substitution', (): void => {
        const template = (f: () => void): TemplateResult =>
            // prettier-ignore
            html`<button onclick="${f}">Hi</button>`;
        let counter = 0;
        const eventHandler = (): void => {
            counter += 1;
        };
        render(template(eventHandler), container);
        container.querySelector('button')?.click();
        assertEquals(counter, 1);
    });

    it('can handle updating event substitution', (): void => {
        const template = (f: () => void): TemplateResult =>
            // prettier-ignore
            html`<button onclick="${f}">Hi</button>`;
        let counter = 0;
        const eventHandler = (): void => {
            counter += 1;
        };
        render(template(eventHandler), container);
        container.querySelector('button')?.click();
        render(template(eventHandler), container);
        container.querySelector('button')?.click();
        assertEquals(counter, 2);
        container.querySelector('button')?.click();
        assertEquals(counter, 3);
    });

    it('can handle substitution rendering single nested template part', (): void => {
        const template = (title: string): TemplateResult => {
            const header = html`<h1>${title}</h1>`;
            // prettier-ignore
            return html`${header}<p>content</p>`;
        };
        // First render, i.e. first time rendering
        render(template('hello world'), container);
        assertEquals(container.innerHTML, `<h1>hello world</h1><p>content</p>`);
        // Render update
        render(template('hi there'), container);
        assertEquals(container.innerHTML, `<h1>hi there</h1><p>content</p>`);
    });

    it('can handle substitution rendering multiple nested template parts', (): void => {
        const template = (title: string, footer: string): TemplateResult => {
            const header = html`<h1>${title}</h1>`;
            // prettier-ignore
            const content = html`${header}<p>content</p>`;
            // prettier-ignore
            return html`${content}<div>${footer}</div>`;
        };
        render(template('1', '2'), container);
        assertEquals(
            container.innerHTML,
            `<h1>1</h1><p>content</p><div>2</div>`
        );
        // Render update
        render(template('1', '3'), container);
        assertEquals(
            container.innerHTML,
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
        render(template('1', 'a1'), container);
        assertEquals(container.innerHTML, `<h1>1</h1><p id="a1">content</p>`);
        // Render update
        render(template('2', 'a2'), container);
        assertEquals(container.innerHTML, `<h1>2</h1><p id="a2">content</p>`);
    });
});
