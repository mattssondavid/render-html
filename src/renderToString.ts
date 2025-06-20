if (typeof Document === 'undefined') {
    await import('./server/shim/shim-dom.ts');
}
import { type TemplateResult } from './html.ts';
import { render } from './render.ts';
import { serializeHTMLfragment } from './serialization/serializeHTMLfragment.ts';

/**
 * Options for rendering a DOM node to a string.
 *
 * @property renderer - Optional. Custom renderer function for nodes. If provided, will be called for each node.
 * @property customElements - Optional. Custom element registry to use for resolving/upgrading custom elements.
 */
type RenderToStringOptions = {
    /**
     * Optional custom renderer to use when rendering the DOM node to string.
     */
    renderer?: (node: Node) => string;

    /**
     * Optional custom element registry to use when checking for custom element
     * definitions.
     */
    customElements?: CustomElementRegistry;
};

/**
 * Render a HTML Template to a string
 *
 * This can be useful for stattic site generation.
 *
 * @param {TemplateResult} templateResult - The template to render
 * @param {RenderToStringOptions | undefined} options - Render options
 * @returns {string} The template result rendered to HTML string
 */
export const renderToString = (
    templateResult: TemplateResult,
    options?: RenderToStringOptions
): string => {
    // Temporary container
    const fragment = new DocumentFragment();
    // Build a node structure with substituted values
    render(templateResult, fragment);
    if (options && options.customElements) {
        // Use the argument provided custom element registry, which can be
        // used to pass along externally set web component definitions
        //
        // Why replace the own `customElements`? Another approach to get the
        // external-from-current-global-CustomElementRegistry definitions would
        // be to load and evaluate script content looking for the custom element
        // definitions, however, this can cause security risks. If wanting to
        // load the script it can be done similar to
        // ```const url = URL.createObjectURL(
        //     new Blob([scriptContent], {
        //         type: 'text/javascript',
        //     })
        // );
        // await import(url);
        // URL.revokeObjectURL(url);
        // ```
        // where `scriptContent` is the <script>'s content
        customElements = options.customElements;
    }
    if (options && options.renderer) {
        // Use custom renderer
        return options.renderer(fragment);
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
