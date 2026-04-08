export const debugNode = (node) => node
    ? `(${node.nodeType}) ${node.nodeName} => ${node.nodeValue}`
    : '(?) ? => ?';
