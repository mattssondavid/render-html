import '@src/server/shim/shim-dom.ts';
import { serialiseHTMLfragment } from '@src/util/node/serialisation/serialiseHTMLfragment.ts';
import { assertEquals } from '@std/assert';
import { afterEach, beforeAll, describe, it } from '@std/testing/bdd';

describe('serialiseHTMLfragment', (): void => {
    beforeAll((): void => {
        /**
         * Tag closed-element
         */
        class ClosedElement extends HTMLElement {
            constructor() {
                super();
            }

            connectedCallback(): void {
                if (!this.shadowRoot) {
                    const template = document.createElement('template');
                    template.innerHTML = `<slot></slot>`;

                    this.attachShadow({ mode: 'closed' }).appendChild(
                        template.content.cloneNode(true)
                    );
                }
            }
        }
        customElements.define('closed-element', ClosedElement);

        /**
         * Tag delegates-focus-element
         */
        class DelegatesFocusElement extends HTMLElement {
            constructor() {
                super();
            }

            connectedCallback(): void {
                if (!this.shadowRoot) {
                    const template = document.createElement('template');
                    template.innerHTML = `<slot></slot>`;

                    this.attachShadow({
                        mode: 'open',
                        delegatesFocus: true,
                    }).appendChild(template.content.cloneNode(true));
                }
            }
        }
        customElements.define('delegates-focus-element', DelegatesFocusElement);

        /**
         * Tag open-element
         */
        class OpenElement extends HTMLElement {
            constructor() {
                super();
            }

            connectedCallback(): void {
                if (!this.shadowRoot) {
                    const template = document.createElement('template');
                    template.innerHTML = `<slot></slot>`;

                    this.attachShadow({ mode: 'open' }).appendChild(
                        template.content.cloneNode(true)
                    );
                }
            }
        }
        customElements.define('open-element', OpenElement);

        /**
         * Tag serializable-element
         */
        class SerializableElement extends HTMLElement {
            constructor() {
                super();
            }

            connectedCallback(): void {
                if (!this.shadowRoot) {
                    const template = document.createElement('template');
                    template.innerHTML = `<slot></slot>`;

                    this.attachShadow({
                        mode: 'open',
                        serializable: true,
                    }).appendChild(template.content.cloneNode(true));
                }
            }
        }
        customElements.define('serializable-element', SerializableElement);

        /**
         * Tag serializable-delegates-focus-element
         */
        class SerializableDelegatesFocusElement extends HTMLElement {
            constructor() {
                super();
            }

            connectedCallback(): void {
                if (!this.shadowRoot) {
                    const template = document.createElement('template');
                    template.innerHTML = `<slot></slot>`;

                    this.attachShadow({
                        mode: 'open',
                        serializable: true,
                        delegatesFocus: true,
                    }).appendChild(template.content.cloneNode(true));
                }
            }
        }
        customElements.define(
            'serializable-delegates-focus-element',
            SerializableDelegatesFocusElement
        );
    });

    afterEach((): void => {
        document.body.replaceChildren(); // Clear body from element children
    });

    it('can serialise a single element', (): void => {
        const container = document.createElement('div');
        assertEquals(serialiseHTMLfragment(container), '<div></div>');
    });

    it('can serialise an element with attributes', (): void => {
        const container = document.createElement('div');
        container.setAttribute('id', 'hi');
        assertEquals(serialiseHTMLfragment(container), '<div id="hi"></div>');
    });

    it('can serialise an element node with attributes requiring escaping', (): void => {
        const container = document.createElement('div');
        container.setAttribute('text', '1<2');
        assertEquals(
            serialiseHTMLfragment(container),
            '<div text="1&lt;2"></div>'
        );
    });

    it('can serialise nested elements', (): void => {
        const container = document.createElement('div');
        const child = document.createElement('span');
        child.textContent = 'Hi';
        container.appendChild(child);
        assertEquals(
            serialiseHTMLfragment(container),
            '<div><span>Hi</span></div>'
        );
    });

    it('can serialise text nodes with HTML escaping', (): void => {
        const container = document.createElement('div');
        container.textContent = '1 < 2 & 3 > 2';
        assertEquals(
            serialiseHTMLfragment(container),
            '<div>1 &lt; 2 &amp; 3 &gt; 2</div>'
        );
    });

    it('can serialise text nodes with unicode escaping', (): void => {
        const container = document.createElement('div');
        container.textContent = '1 \u00A0'; // 1 no-break space
        assertEquals(serialiseHTMLfragment(container), '<div>1 &nbsp;</div>');
    });

    it('can serialise comment nodes', (): void => {
        const fragment = document.createDocumentFragment();
        const comment = document.createComment('comment');
        fragment.appendChild(comment);
        assertEquals(serialiseHTMLfragment(fragment), '<!--comment-->');
    });

    it('can serialise a document fragment with mixed nodes', (): void => {
        const fragment = document.createDocumentFragment();
        const div = document.createElement('div');
        div.textContent = 'abc';
        const comment = document.createComment('foo');
        fragment.appendChild(div);
        fragment.appendChild(comment);
        assertEquals(
            serialiseHTMLfragment(fragment),
            '<div>abc</div><!--foo-->'
        );
    });

    it('can serialise empty element', (): void => {
        const span = document.createElement('span');
        assertEquals(serialiseHTMLfragment(span), '<span></span>');
    });

    it('can serialise void elements', (): void => {
        const br = document.createElement('br');
        assertEquals(serialiseHTMLfragment(br), '<br>');
    });

    it('can serialise doctype node', (): void => {
        const htmlDocument = document.implementation.createHTMLDocument();
        // <!DOCTYPE html><html><head></head><body></body></html>
        assertEquals(
            serialiseHTMLfragment(htmlDocument.firstChild!),
            '<!DOCTYPE html>'
        );
    });

    it('can serialise custom element without options', (): void => {
        const element = document.createElement('open-element');
        const p = document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        document.body.appendChild(element);
        assertEquals(serialiseHTMLfragment(element), '<p>Hello there</p>');
    });

    it('serialises custom element with closed element shadowRoot with option serializableShadowRoots', (): void => {
        const element = document.createElement('closed-element');
        const p = document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        document.body.appendChild(element);
        assertEquals(
            serialiseHTMLfragment(element, { serializableShadowRoots: true }),
            '<p>Hello there</p>'
        );
    });

    it('serialises custom element with specified closed ShadowRoot with option shadowRoots', (): void => {
        const element = document.createElement('closed-element');
        const p = document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        document.body.appendChild(element);
        assertEquals(
            serialiseHTMLfragment(element, {
                shadowRoots: [element.shadowRoot!],
            }),
            '<p>Hello there</p>'
        );
    });

    it('serialises custom element with open element shadowRoot with option serializableShadowRoots', (): void => {
        const element = document.createElement('serializable-element');
        const p = document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        document.body.appendChild(element);
        const expected = `\
            <template \
                shadowrootmode="open" \
                shadowrootserializable="" \
                ><slot></slot> \
            </template> \
            <p>Hello there</p>`
            .replaceAll(/\s{2,}/g, ' ')
            .replaceAll(' >', '>')
            .replaceAll('> <', '><')
            .trim();
        assertEquals(
            serialiseHTMLfragment(element, {
                serializableShadowRoots: true,
            }),
            expected
        );
    });

    it('serialises custom element with open element shadowRoot with option serializableShadowRoots but element is not serialiseable', (): void => {
        const element = document.createElement('open-element');
        const p = document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        document.body.appendChild(element);
        assertEquals(
            serialiseHTMLfragment(element, {
                serializableShadowRoots: true,
            }),
            '<p>Hello there</p>'
        );
    });

    it('serialises custom element with delegate focus with option serializableShadowRoots but element is not serialiseable', (): void => {
        const element = document.createElement('delegates-focus-element');
        const p = document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        document.body.appendChild(element);
        assertEquals(
            serialiseHTMLfragment(element, {
                serializableShadowRoots: true,
            }),
            '<p>Hello there</p>'
        );
    });

    it('serialises custom element with delegate focus with option serializableShadowRoots', (): void => {
        const element = document.createElement(
            'serializable-delegates-focus-element'
        );
        const p = document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        document.body.appendChild(element);
        const expected = `\
            <template \
                shadowrootmode="open" \
                shadowrootdelegatesfocus="" \
                shadowrootserializable="" \
                ><slot></slot> \
            </template> \
            <p>Hello there</p>`
            .replaceAll(/\s{2,}/g, ' ')
            .replaceAll(' >', '>')
            .replaceAll('> <', '><')
            .trim();
        assertEquals(
            serialiseHTMLfragment(element, {
                serializableShadowRoots: true,
            }),
            expected
        );
    });

    it('serialises custom element with specified open ShadowRoot with option shadowRoots', (): void => {
        const element = document.createElement('serializable-element');
        const p = document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        document.body.appendChild(element);
        const expected = `
            <template \
                shadowrootmode="open" \
                shadowrootserializable="" \
                ><slot></slot> \
            </template> \
            <p>Hello there</p>`
            .replaceAll(/\s{2,}/g, ' ')
            .replaceAll(' >', '>')
            .replaceAll('> <', '><')
            .trim();
        assertEquals(
            serialiseHTMLfragment(element, {
                shadowRoots: [element.shadowRoot!],
            }),
            expected
        );
    });

    it('serialises custom element once with open element ShadowRoot and same ShadowRoot specified with option serializableShadowRoots and shadowRoots', (): void => {
        const element = document.createElement('serializable-element');
        const p = document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        document.body.appendChild(element);
        const expected = `
            <template \
                shadowrootmode="open" \
                shadowrootserializable="" \
                ><slot></slot> \
            </template> \
            <p>Hello there</p>`
            .replaceAll(/\s{2,}/g, ' ')
            .replaceAll(' >', '>')
            .replaceAll('> <', '><')
            .trim();
        assertEquals(
            serialiseHTMLfragment(element, {
                serializableShadowRoots: true,
                shadowRoots: [element.shadowRoot!],
            }),
            expected
        );
    });

    it('serialises nestled custom elements with open ShadowRoots with option serializableShadowRoots', (): void => {
        const outerElement = document.createElement('serializable-element');
        const innerElement = document.createElement('serializable-element');
        const p = document.createElement('p');
        p.textContent = 'Hello there';
        innerElement.appendChild(p);
        outerElement.appendChild(innerElement);
        document.body.appendChild(outerElement);
        const expected = `\
            <template \
                shadowrootmode="open" \
                shadowrootserializable="" \
            ><slot></slot> \
            </template> \
            <serializable-element> \
                <template \
                    shadowrootmode="open" \
                    shadowrootserializable="" \
                ><slot></slot> \
                </template> \
                <p>Hello there</p> \
            </serializable-element>`
            .replaceAll(/\s{2,}/g, ' ')
            .replaceAll(' >', '>')
            .replaceAll('> <', '><')
            .trim();
        assertEquals(
            serialiseHTMLfragment(outerElement, {
                serializableShadowRoots: true,
            }),
            expected
        );
    });
});
