import { debugNode } from './debugNode.ts';

/**
 * Prints the node tree to console via `console.log`
 *
 * @param {Node|null} node The node to print
 * @param {number} depth Tree depth
 */
export const treePrintNode = (node: Node | null, depth: number = 0): void => {
    if (!node) return;
    console.log(`${'\t'.repeat(depth)}${debugNode(node)}`);
    node.childNodes.forEach((child): void => treePrintNode(child, depth + 1));
};
