if (typeof self.document === 'undefined') {
    await import('@src/server/shim/shim-dom.ts');
}
import { serializeHTMLfragment } from '@src/serialization/serializeHTMLfragment.ts';
import { assertEquals } from '@std/assert';
import { afterEach, beforeAll, describe, it } from '@std/testing/bdd';

describe('serializeHTMLfragment', (): void => {
    beforeAll((): void => {
        /**
         * Tag closed-element
         */
        class ClosedElement extends self.HTMLElement {
            constructor() {
                super();
            }

            connectedCallback(): void {
                if (!this.shadowRoot) {
                    const template = self.document.createElement('template');
                    template.innerHTML = `<slot></slot>`;

                    this.attachShadow({ mode: 'closed' }).appendChild(
                        template.content.cloneNode(true)
                    );
                }
            }
        }
        self.customElements.define('closed-element', ClosedElement);

        /**
         * Tag delegates-focus-element
         */
        class DelegatesFocusElement extends HTMLElement {
            constructor() {
                super();
            }

            connectedCallback(): void {
                if (!this.shadowRoot) {
                    const template = self.document.createElement('template');
                    template.innerHTML = `<slot></slot>`;

                    this.attachShadow({
                        mode: 'open',
                        delegatesFocus: true,
                    }).appendChild(template.content.cloneNode(true));
                }
            }
        }
        self.customElements.define(
            'delegates-focus-element',
            DelegatesFocusElement
        );

        /**
         * Tag open-element
         */
        class OpenElement extends HTMLElement {
            constructor() {
                super();
            }

            connectedCallback(): void {
                if (!this.shadowRoot) {
                    const template = self.document.createElement('template');
                    template.innerHTML = `<slot></slot>`;

                    this.attachShadow({ mode: 'open' }).appendChild(
                        template.content.cloneNode(true)
                    );
                }
            }
        }
        self.customElements.define('open-element', OpenElement);

        /**
         * Tag serializable-element
         */
        class SerializableElement extends HTMLElement {
            constructor() {
                super();
            }

            connectedCallback(): void {
                if (!this.shadowRoot) {
                    const template = self.document.createElement('template');
                    template.innerHTML = `<slot></slot>`;

                    this.attachShadow({
                        mode: 'open',
                        serializable: true,
                    }).appendChild(template.content.cloneNode(true));
                }
            }
        }
        self.customElements.define('serializable-element', SerializableElement);

        /**
         * Tag serializable-delegates-focus-element
         */
        class SerializableDelegatesFocusElement extends HTMLElement {
            constructor() {
                super();
            }

            connectedCallback(): void {
                if (!this.shadowRoot) {
                    const template = self.document.createElement('template');
                    template.innerHTML = `<slot></slot>`;

                    this.attachShadow({
                        mode: 'open',
                        serializable: true,
                        delegatesFocus: true,
                    }).appendChild(template.content.cloneNode(true));
                }
            }
        }
        self.customElements.define(
            'serializable-delegates-focus-element',
            SerializableDelegatesFocusElement
        );
    });

    afterEach((): void => {
        self.document.body.replaceChildren(); // Clear body from element children
    });

    it('can serialise empty element', (): void => {
        const span = self.document.createElement('span');
        assertEquals(serializeHTMLfragment(span), '');
    });

    it('can serialise a single element', (): void => {
        const p = self.document.createElement('p');
        p.textContent = 'Hi';
        assertEquals(serializeHTMLfragment(p), 'Hi');
    });

    it('can serialise an element with child', (): void => {
        const container = self.document.createElement('div');
        const p = self.document.createElement('p');
        p.textContent = 'Hi';
        container.appendChild(p);
        assertEquals(serializeHTMLfragment(container), '<p>Hi</p>');
    });

    it('can serialise an element with attributes', (): void => {
        const container = self.document.createElement('div');
        container.setAttribute('id', 'hi');
        assertEquals(serializeHTMLfragment(container), '');
    });

    it('can serialise a child element with attribute', (): void => {
        const container = self.document.createElement('div');
        container.setAttribute('id', 'hi');
        const p = self.document.createElement('p');
        p.setAttribute('id', '2');
        container.appendChild(p);
        assertEquals(serializeHTMLfragment(container), '<p id="2"></p>');
    });

    it('can serialise an element node with attributes requiring escaping', (): void => {
        const container = self.document.createElement('div');
        const p = self.document.createElement('p');
        p.setAttribute('text', '1<2');
        container.appendChild(p);
        assertEquals(serializeHTMLfragment(container), '<p text="1&lt;2"></p>');
    });

    it('can serialise nested elements', (): void => {
        const container = self.document.createElement('div');
        const p = self.document.createElement('p');
        const span = self.document.createElement('span');
        span.textContent = 'Hi';
        p.appendChild(span);
        container.appendChild(p);
        assertEquals(
            serializeHTMLfragment(container),
            '<p><span>Hi</span></p>'
        );
    });

    it('can serialise a list', (): void => {
        const container = self.document.createElement('div');
        const ul = self.document.createElement('ul');
        [1, 2, 3].forEach((value, index): void => {
            const li = self.document.createElement('li');
            if (index === 1) {
                li.setAttribute('selected', '');
            }
            const text = self.document.createTextNode(String(value));
            li.appendChild(text);
            ul.appendChild(li);
        });
        container.appendChild(ul);
        assertEquals(
            serializeHTMLfragment(container),
            '<ul><li>1</li><li selected="">2</li><li>3</li></ul>'
        );
    });

    it('can serialise text node with HTML escaping', (): void => {
        const container = self.document.createElement('div');
        container.textContent = '1 < 2 & 3 > 2';
        assertEquals(
            serializeHTMLfragment(container),
            '1 &lt; 2 &amp; 3 &gt; 2'
        );
    });

    it('can serialise text node with unicode escaping', (): void => {
        const container = self.document.createElement('div');
        container.textContent = '1 \u00A0'; // 1 no-break space
        assertEquals(serializeHTMLfragment(container), '1 &nbsp;');
    });

    it('can serialise comment node', (): void => {
        const container = self.document.createElement('div');
        const comment = self.document.createComment('comment');
        container.appendChild(comment);
        assertEquals(serializeHTMLfragment(container), '<!--comment-->');
    });

    it('can serialise a document fragment with mixed nodes', (): void => {
        const fragment = self.document.createDocumentFragment();
        const div = self.document.createElement('div');
        div.textContent = 'abc';
        const comment = self.document.createComment('foo');
        fragment.appendChild(div);
        fragment.appendChild(comment);
        assertEquals(
            serializeHTMLfragment(fragment),
            '<div>abc</div><!--foo-->'
        );
    });

    it('can serialise void element', (): void => {
        const container = self.document.createElement('div');
        const br = self.document.createElement('br');
        container.appendChild(br);
        assertEquals(serializeHTMLfragment(container), '<br>');
    });

    it('can serialise doctype node', (): void => {
        const htmlDocument = self.document.implementation.createHTMLDocument();
        // <!DOCTYPE html><html><head></head><body></body></html>
        // We only care of the document type onde
        htmlDocument.removeChild(htmlDocument.lastChild!);
        assertEquals(serializeHTMLfragment(htmlDocument), '<!DOCTYPE html>');
    });

    it('can serialise custom element without options', (): void => {
        const element = self.document.createElement('open-element');
        const p = self.document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        self.document.body.appendChild(element);
        assertEquals(serializeHTMLfragment(element), '<p>Hello there</p>');
    });

    it('can serialise custom element with closed element shadowRoot with option serializableShadowRoots', (): void => {
        const element = self.document.createElement('closed-element');
        const p = self.document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        self.document.body.appendChild(element);
        assertEquals(
            serializeHTMLfragment(element, { serializableShadowRoots: true }),
            '<p>Hello there</p>'
        );
    });

    it('can serialise custom element with specified closed ShadowRoot with option shadowRoots', (): void => {
        const element = self.document.createElement('closed-element');
        const p = self.document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        self.document.body.appendChild(element);
        assertEquals(
            serializeHTMLfragment(element, {
                shadowRoots: [element.shadowRoot!],
            }),
            '<p>Hello there</p>'
        );
    });

    it('can serialise custom element with open element shadowRoot with option serializableShadowRoots', (): void => {
        const element = self.document.createElement('serializable-element');
        const p = self.document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        self.document.body.appendChild(element);
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
            serializeHTMLfragment(element, {
                serializableShadowRoots: true,
            }),
            expected
        );
    });

    it('can serialise custom element with open element shadowRoot with option serializableShadowRoots but element is not serialiseable', (): void => {
        const element = self.document.createElement('open-element');
        const p = self.document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        self.document.body.appendChild(element);
        assertEquals(
            serializeHTMLfragment(element, {
                serializableShadowRoots: true,
            }),
            '<p>Hello there</p>'
        );
    });

    it('can serialise custom element with delegate focus with option serializableShadowRoots but element is not serialiseable', (): void => {
        const element = self.document.createElement('delegates-focus-element');
        const p = self.document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        self.document.body.appendChild(element);
        assertEquals(
            serializeHTMLfragment(element, {
                serializableShadowRoots: true,
            }),
            '<p>Hello there</p>'
        );
    });

    it('can serialise custom element with delegate focus with option serializableShadowRoots', (): void => {
        const element = self.document.createElement(
            'serializable-delegates-focus-element'
        );
        const p = self.document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        self.document.body.appendChild(element);
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
            serializeHTMLfragment(element, {
                serializableShadowRoots: true,
            }),
            expected
        );
    });

    it('can serialise custom element with specified open ShadowRoot with option shadowRoots', (): void => {
        const element = self.document.createElement('serializable-element');
        const p = self.document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        self.document.body.appendChild(element);
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
            serializeHTMLfragment(element, {
                shadowRoots: [element.shadowRoot!],
            }),
            expected
        );
    });

    it('can serialise custom element once with open element ShadowRoot and same ShadowRoot specified with option serializableShadowRoots and shadowRoots', (): void => {
        const element = self.document.createElement('serializable-element');
        const p = self.document.createElement('p');
        p.textContent = 'Hello there';
        element.appendChild(p);
        self.document.body.appendChild(element);
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
            serializeHTMLfragment(element, {
                serializableShadowRoots: true,
                shadowRoots: [element.shadowRoot!],
            }),
            expected
        );
    });

    it('can serialise nestled custom elements with open ShadowRoots with option serializableShadowRoots', (): void => {
        const outerElement = self.document.createElement(
            'serializable-element'
        );
        const innerElement = self.document.createElement(
            'serializable-element'
        );
        const p = self.document.createElement('p');
        p.textContent = 'Hello there';
        innerElement.appendChild(p);
        outerElement.appendChild(innerElement);
        self.document.body.appendChild(outerElement);
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
            serializeHTMLfragment(outerElement, {
                serializableShadowRoots: true,
            }),
            expected
        );
    });
});
