import { debugNode } from "./debugNode.js";
export const treePrintNode = (node, depth = 0) => {
    if (!node)
        return;
    console.log(`${'\t'.repeat(depth)}${debugNode(node)}`);
    node.childNodes.forEach((child) => treePrintNode(child, depth + 1));
};
