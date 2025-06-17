import { type TemplateResult } from './html.ts';
import { render } from './render.ts';
import { serializeHTMLfragment } from './util/node/serialization/serializeHTMLfragment.ts';

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
        return serializeHTMLfragment(fragment);
    }
};
