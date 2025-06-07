/**
 * Temporary debug helper to render information about the node
 * @param {Node} node The node to debug
 * @returns {string} The node debug info
 */
export const debugNode = (node: Node): string =>
    `(${node.nodeType}) ${node.nodeName} => ${node.nodeValue}`;
