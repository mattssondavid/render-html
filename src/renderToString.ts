if (typeof Document === 'undefined') {
    await import('./server/shim/shim-dom.ts');
}
import { type TemplateResult } from './html.ts';
import { render } from './render.ts';
import { serializeHTMLfragment } from './serialization/serializeHTMLfragment.ts';
import { debugNode } from './util/node/debug/debugNode.ts';
import { treePrintNode } from './util/node/debug/treePrintNode.ts';

/**
 * Render a HTML Template to a string
 *
 * This can be useful for stattic site generation.
 *
 * @param {TemplateResult} templateResult The template to render
 * @returns {string} The rendered HTML
 */
export const renderToString = (
    templateResult: TemplateResult,
    renderer?: (node: Node) => string
): string => {
    // Temporary container
    const fragment = new DocumentFragment();
    // Build a node structure with substituted values
    render(templateResult, fragment);
    if (renderer) {
        return renderer(fragment);
    } else {
        /**
         * Check if custom tag element (i.e. a web component)
         */
        treePrintNode(fragment);
        const customTagPattern = /[a-z]+-[a-z]+/;
        const walker = document.createTreeWalker(
            fragment,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node): number => {
                    if (
                        customTagPattern.test(
                            (node as Element).tagName.toLowerCase()
                        )
                    )
                        return NodeFilter.FILTER_ACCEPT;
                    return NodeFilter.FILTER_SKIP;
                },
            }
        );
        let serializeOptions:
            | {
                  serializableShadowRoots?: boolean;
                  shadowRoots?: ShadowRoot[];
              }
            | undefined = undefined;
        const options = [];
        while (walker.nextNode()) {
            const element = walker.currentNode as Element;
            const definition = customElements.get(
                element.tagName.toLowerCase()
            );
            console.log(debugNode(walker.currentNode), definition);
            if (definition) {
                // Upgrade element
                customElements.upgrade(element);

                // Set the serialise options
                if (element.shadowRoot) {
                    // The element is a Shadow Host
                    options.push({
                        serializableShadowRoots:
                            element.shadowRoot.serializable ?? undefined,
                        shadowRoots: [element.shadowRoot],
                    });
                } else {
                    // Failed to check if the web component element is a
                    // Shadow Host.
                    //
                    // Try to call the `connectedCallback` method of the web
                    // component as a ShadowRoot might be added/inserted when
                    // the element is added to the DOM.
                    const fragment = new DocumentFragment();
                    const fakeElement = new definition();
                    fragment.appendChild(fakeElement);
                    if (fakeElement.shadowRoot) {
                        options.push({
                            serializableShadowRoots:
                                fakeElement.shadowRoot.serializable ??
                                undefined,
                            shadowRoots: [fakeElement.shadowRoot],
                        });
                    }
                    fragment.replaceChildren(); // Clear so garbage collecting

                    // TODO: Does appending the element to a documetn fragment trigger the connected callback??
                    // If it doesn't then test creating a temporary document via  document.implementation.createHTMLDocument
                }
            }
        }
        console.log(options);
        const opt = options.reduce(
            (
                accumulator:
                    | {
                          serializableShadowRoots?: boolean;
                          shadowRoots?: ShadowRoot[];
                      }
                    | undefined,
                currentValue: {
                    serializableShadowRoots?: boolean;
                    shadowRoots?: ShadowRoot[];
                }
            ):
                | {
                      serializableShadowRoots?: boolean;
                      shadowRoots?: ShadowRoot[];
                  }
                | undefined => {
                console.log(currentValue);

                return currentValue;
            },
            undefined
        );

        return serializeHTMLfragment(fragment, serializeOptions);
    }
};
