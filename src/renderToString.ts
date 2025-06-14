import { isTemplateResult, type TemplateResult } from './html.ts';
import { debugNode } from './util/node/debug/debugNode.ts';
import { treePrintNode } from './util/node/debug/treePrintNode.ts';
import { getNodeFromPathViaAncesterNode } from './util/node/getNodeFromPathViaAncesterNode.ts';

type Part =
    | {
          type: 'text';
          nodes: Node[];
          lastValue: unknown;
      }
    | {
          type: 'attr';
          node: Element;
          attr: string;
      }
    | {
          type: 'event';
          node: Element;
          event: string;
          lastEventListener?: EventListener;
      };

const templateResultCache = new WeakMap<TemplateResult>();

/**
 * Render a HTML Template to a string
 *
 * This can be useful for stattic site generation.
 *
 * @param {TemplateResult} templateResult The template to render
 * @returns {string} The rendered HTML
 */
export const renderToString = (templateResult: TemplateResult): string => {
    /**
     * From Github copilot on approach for the function...
     *
     * Reads the original template's static strings and part metadata.
     * For each part, interpolates:
     * Plain text: Escape as needed and insert.
     * Nested TemplateResult: Recursively call renderToString.
     * Arrays: Flatten, render each, and join.
     * Attributes/events: Only render attributes; skip events on server-side.
     *
     * Key notes
     * Attributes: If your template system injects placeholder attributes
     * (like attr=""), you can replace them as shown above.
     * Events: Omit event attributes in SSR.
     * Arrays & Nesting: Handled recursively, so deeply nested templates/arrays are supported.
     * Escaping: Always escape text content and attribute values.
     *
     * Summary Table
     * Substitution Type	Output in String
     * Text	Escaped & inserted
     * Attr	attr="value"
     * Event	(skip, SSR)
     * Nested Template	Recursively rendered
     * Array	Flatten & render all
     */

    /**
     * Notes
     *
     * Should probably just use `Element.getHTML()`
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getHTML
     */

    if (!templateResultCache.has(templateResult)) {
        const parts: Part[] = [];
        const { template, partMeta, substitutions } = templateResult;
        const fragmentRoot = template.content.cloneNode(true);

        console.group('INPUTS');
        console.log('template');
        treePrintNode(fragmentRoot);
        console.log();
        console.log('Part Meta');
        console.log(partMeta);
        console.log();
        console.log('Substitutions');
        console.log(substitutions);
        console.groupEnd(); // End INPUTS

        if (partMeta.length === 0) {
            // Dirty approach
            const result = fragmentRoot.childNodes
                .values()
                .map((node): string => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        return (node as Element).outerHTML;
                    } else {
                        return node.nodeValue ?? '';
                    }
                });
            return [...result].join('');
        }

        partMeta.map((meta, index): string => {
            const substitution = substitutions[index];
            const node = getNodeFromPathViaAncesterNode(
                meta.path,
                fragmentRoot
            );
            if (node === null) {
                return '';
            }

            console.log(substitution);
            console.log(debugNode(node));

            switch (meta.type) {
                case 'attr': {
                    (node as Element).setAttribute(
                        meta.attr!,
                        String(substitution)
                    );
                    parts.push({
                        type: 'attr',
                        node: node as Element,
                        attr: meta.attr!,
                    });
                    break;
                }

                case 'event': {
                    // Skip events when rendering for server-side
                    break;
                }

                case 'text': {
                    if (isTemplateResult(substitution)) {
                        // ??
                    } else if (Array.isArray(substitution)) {
                        // ToDo: Implement support
                    } else {
                        const text = document.createTextNode(
                            String(substitution)
                        );
                        node.parentNode?.replaceChild(text, node);
                        parts.push({
                            type: 'text',
                            nodes: [text],
                            lastValue: substitution,
                        });
                    }
                    break;
                }
            }

            return '';
        });

        console.log(parts);
    }
    const cached = templateResultCache.get(templateResult);
    return '';
};
