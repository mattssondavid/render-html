if (typeof Document === 'undefined') {
    await import('./server/shim/shim-dom.ts');
}
import { type TemplateResult } from './html.ts';
import { render } from './render.ts';
import { serializeHTMLfragment } from './serialization/serializeHTMLfragment.ts';

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
        // Use custom renderer
        return renderer(fragment);
    } else {
        /**
         * Check for custom tag elements (i.e. a web component).
         * If there are some, enable serialising for web components
         */
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
        const options: {
            serializableShadowRoots?: boolean;
            shadowRoots?: ShadowRoot[];
        }[] = [];
        while (walker.nextNode()) {
            const element = walker.currentNode as Element;
            const definition = customElements.get(
                element.tagName.toLowerCase()
            );
            if (definition) {
                // Upgrade the element
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
                    // component as a `ShadowRoot` might have been
                    // added/inserted when the element is added to the DOM, even
                    // though the spec recommends adding a ShadowRoot, and thus
                    // convert the web component to a Shadow Host, in the web
                    // component constructor. The callback is only called if the
                    // element node is added to a document (i.e if the
                    // shadow-including root is a document).
                    // @see https://dom.spec.whatwg.org/#connected
                    // @see https://html.spec.whatwg.org/multipage/custom-elements.html#custom-element-conformance
                    const doc = document.implementation.createHTMLDocument();
                    const fakeElement = new definition();
                    doc.body.appendChild(fakeElement);
                    if (fakeElement.shadowRoot) {
                        options.push({
                            serializableShadowRoots:
                                fakeElement.shadowRoot.serializable ??
                                undefined,
                            shadowRoots: [fakeElement.shadowRoot],
                        });

                        // Replace the element in the temporary container with
                        // the fake
                        fakeElement.append(...element.childNodes);
                        element.replaceWith(fakeElement);
                    }
                }
            }
        }

        const serializeOptions:
            | {
                  serializableShadowRoots?: boolean;
                  shadowRoots?: ShadowRoot[];
              }
            | undefined = options.reduce(
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
            ): {
                serializableShadowRoots?: boolean;
                shadowRoots?: ShadowRoot[];
            } => {
                let serializableShadowRoots: boolean | undefined =
                    currentValue.serializableShadowRoots;
                if (!serializableShadowRoots) {
                    // Use previous value instead
                    serializableShadowRoots =
                        accumulator?.serializableShadowRoots;
                }
                const shadowRoots: ShadowRoot[] = [
                    ...(accumulator?.shadowRoots ?? []),
                    ...(currentValue.shadowRoots ?? []),
                ];
                return {
                    serializableShadowRoots,
                    shadowRoots,
                };
            },
            undefined
        );

        return serializeHTMLfragment(fragment, serializeOptions);
    }
};
