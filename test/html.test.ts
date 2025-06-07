import { html, render, type TemplateResult } from '@src/html.ts';
import '@src/server/shim/shim-dom.ts';
import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';

describe('html tagged template literal node', (): void => {
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

    it('can handle no substition', (): void => {
        const template = (): TemplateResult => html`<p>hi</p>`;
        render(template(), container);
        assertEquals(container.innerHTML, `<p>hi</p>`);
    });

    it('can handle no substition with children', (): void => {
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

    it('can handle substition update', (): void => {
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

    // it('can handle event', (): void => {
    //     const template = (f: () => void): TemplateResult =>
    //         // prettier-ignore
    //         html`<button onclick="${f}">Hi</button>`;
    //     let counter = 0;
    //     const eventHandler = (): void => {
    //         counter += 1;
    //     };
    //     render(template(eventHandler), container);
    //     container.querySelector('button')?.click();
    //     assertEquals(counter, 1);
    // });

    // it('can handle rendering template parts', (): void => {
    //     const title = 'hello world';
    //     const header = html`<h1>${title}</h1>`;
    //     // prettier-ignore
    //     const content = html`${header}<p>content</p>`;
    //     render(content, container);
    //     assertEquals(container.innerHTML, `<h1>${title}</h1><p>content</p>`);
    // });
});
