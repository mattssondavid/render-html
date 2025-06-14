import { serialiseHTMLfragment } from '@src/util/node/serialisation/serialiseHTMLfragment.ts';
import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';

describe('serialiseHTMLfragment', (): void => {
    it('can serialise a single element', (): void => {
        const container = document.createElement('div');
        assertEquals(serialiseHTMLfragment(container), '<div></div>');
    });

    it('can serialise an element with attributes', (): void => {
        const container = document.createElement('div');
        container.setAttribute('id', 'hi');
        assertEquals(serialiseHTMLfragment(container), '<div id="hi"></div>');
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
});
