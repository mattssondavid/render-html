import { TemplateResult } from './html.ts';
import { debugNode } from './util/node/debugNode.ts';
import { getNodeFromPathViaAncesterNode } from './util/node/getNodeFromPathViaAncesterNode.ts';

type NodeInstance = {
    parent: Node;
    nodes: Node[];
    parts: Part[];
};

type Part =
    | { type: 'text'; node: Text }
    | {
          type: 'attr';
          node: Element;
          attr: string;
      }
    | {
          type: 'event';
          node: Element;
          event: string;
          lastHandler?: EventListener;
      };

const nodeInstanceCache = new WeakMap<Node, NodeInstance>();

const createNodeInstance = (templateResult: TemplateResult): NodeInstance => {
    const parts: Part[] = [];
    const { template, partMeta, substitutions } = templateResult;
    const fragmentRoot = template.content.cloneNode(true);

    partMeta.forEach((meta, index): void => {
        const substitution = substitutions[index];
        const node = getNodeFromPathViaAncesterNode(meta.path, fragmentRoot);
        if (node === null) {
            return;
        }

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
                console.log('event', debugNode(node));
                break;
            }

            case 'text': {
                const text = document.createTextNode(String(substitution));
                node.parentNode?.replaceChild(text, node);
                parts.push({ type: 'text', node: text });
                break;
            }
        }
    });

    return {
        parent: null as unknown as Node,
        nodes: Array.from(fragmentRoot.childNodes),
        parts,
    };
};

/**
 * Render the html template to a HTML Node
 */
export const render = (
    templateResult: TemplateResult,
    container: Node
): void => {
    if (!nodeInstanceCache.has(container)) {
        // First time render with substitutions
        const instance = createNodeInstance(templateResult);
        instance.parent = container;
        for (const node of instance.nodes) {
            instance.parent.appendChild(node);
        }
        nodeInstanceCache.set(container, instance);
    } else {
        // Update with new subsitution values
        const instance = nodeInstanceCache.get(container);
        instance?.parts.forEach((part, index): void => {
            const substition = templateResult.substitutions[index];
            switch (part.type) {
                case 'attr': {
                    part.node.setAttribute(part.attr, String(substition));
                    break;
                }

                case 'event': {
                    break;
                }

                case 'text': {
                    part.node.textContent = String(substition);
                    break;
                }
            }
        });
    }
};
