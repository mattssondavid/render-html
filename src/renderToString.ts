import { isTemplateResult, type TemplateResult } from './html.ts';
import { serializeHTMLfragment } from './serialization/serializeHTMLfragment.ts';

const interpolate = (templateResult: TemplateResult): string => {
    const { templateWithPlaceholders, partMeta, substitutions } =
        templateResult;

    let result = templateWithPlaceholders;
    partMeta.forEach((meta): void => {
        const substitution = substitutions[meta.substitutionIndex];
        if (isTemplateResult(substitution)) {
            result = result.replace(
                meta.substitutionPlaceholder,
                String(interpolate(substitution))
            );
        } else {
            switch (meta.type) {
                case 'attr':
                case 'text': {
                    result = result.replace(
                        meta.substitutionPlaceholder,
                        String(substitution)
                    );
                    break;
                }

                case 'event': {
                    const reEvent = /([^\s=>\/]+)\s*=\s*(['"]?)([^'"]*)(['"]?)/;
                    if (reEvent.test(result)) {
                        const match = result.match(reEvent);
                        if (match) {
                            const event = match[1];
                            if (event.includes(meta.event!)) {
                                const index = result.indexOf(event);
                                const removedEvent = result.replace(
                                    reEvent,
                                    ''
                                );

                                result =
                                    // Remove event + empty space before the event
                                    removedEvent.slice(0, index - 1) +
                                    removedEvent.slice(index);
                            }
                        }
                    }
                    break;
                }
            }
        }
    });
    return result;
};

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

    /**
     * Optional serialize custom element shadow root's adopted stylesheets
     */
    serializeShadowRootAdoptedStyleSheets?: boolean;
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
    const templateContent = interpolate(templateResult);
    let fragment: Node;
    if (/^\s*<html[\s>]/gim.test(templateContent)) {
        const parser = new self.DOMParser();
        const doc = parser.parseFromString(templateContent, 'text/html');
        const docTypematch = templateContent.match(
            /^\s*<!DOCTYPE\s+([^\s>]+)(?:\s+(PUBLIC|SYSTEM)\s+"([^"]*)"(?:\s+"([^"]*)")?)?\s*>/i
        );
        if (docTypematch) {
            const newDocType = self.document.implementation.createDocumentType(
                docTypematch[1] ?? 'html',
                docTypematch[3] ?? '',
                docTypematch[4] ?? ''
            );
            // Replace the DomParser's standard DocType...
            if (doc.doctype) {
                doc.removeChild(doc.doctype);
            }
            doc.insertBefore(newDocType, doc.documentElement);
        }
        fragment = doc;
    } else {
        const template = self.document.createElement('template');
        template.innerHTML = templateContent;
        fragment = template.content;
    }

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
        self.customElements = options.customElements;
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
        const walker = self.document.createTreeWalker(
            fragment,
            self.NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node: Node): number => {
                    if (
                        customTagPattern.test(
                            (node as Element).tagName.toLowerCase()
                        )
                    )
                        return self.NodeFilter.FILTER_ACCEPT;
                    return self.NodeFilter.FILTER_SKIP;
                },
            }
        );
        const _serializeOptions: {
            serializableShadowRoots?: boolean;
            shadowRoots?: ShadowRoot[];
        }[] = [];
        while (walker.nextNode()) {
            const element = walker.currentNode as Element;
            const definition = self.customElements.get(
                element.tagName.toLowerCase()
            );
            if (definition) {
                // Upgrade the element
                self.customElements.upgrade(element);
                // Set the serialise options
                if (element.shadowRoot) {
                    // The element is a Shadow Host
                    _serializeOptions.push({
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
                    const doc =
                        self.document.implementation.createHTMLDocument();
                    const fakeElement = new definition();
                    doc.body.appendChild(fakeElement);
                    if (fakeElement.shadowRoot) {
                        _serializeOptions.push({
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
            | undefined = _serializeOptions.reduce(
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

        if (options && options.serializeShadowRootAdoptedStyleSheets) {
            // Side effect-patch the fragment iff it has a node with a shadow root
            // containing adopted stylesheets. This is done to let the serialise
            // algorithm serialise the adopted stylesheet as <style> tag
            patchShadowHostNodesWithInlineStyles(fragment);
        }

        return serializeHTMLfragment(fragment, serializeOptions);
    }
};

const patchShadowHostNodesWithInlineStyles = (node: Node): Node => {
    const insertStyleNodesFromAdoptedStylesOnShadowRoots = (
        node: Node
    ): void => {
        if (
            node.nodeType === self.Node.ELEMENT_NODE &&
            (node as Element).shadowRoot !== null
        ) {
            const shadow = (node as Element).shadowRoot!;
            shadow.adoptedStyleSheets
                .map((sheet): HTMLStyleElement => {
                    const rules = [...sheet.cssRules].map(
                        (rule): string => rule.cssText
                    );
                    const styleElement =
                        shadow.ownerDocument.createElement('style');
                    styleElement.textContent = rules.join('');
                    return styleElement;
                })
                // Side effect: Add <style> tag to the shadow root
                .forEach(
                    (styleElement): HTMLStyleElement =>
                        shadow.insertBefore(styleElement, shadow.firstChild)
                );
        }
    };

    insertStyleNodesFromAdoptedStylesOnShadowRoots(node);
    Array.from(node.childNodes).forEach(
        insertStyleNodesFromAdoptedStylesOnShadowRoots
    );
    return node;
};
