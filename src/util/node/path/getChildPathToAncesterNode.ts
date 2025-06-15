/**
 * Determine current node's position in the node Tree as viewed from the
 * first parent's (e.g. an template DocumentFragment) children
 *
 * @returns {number[]} The path
 */
export const getChildPathToAncesterNode = (
    node: Node,
    ancesterNode: Node
): number[] => {
    /*
     * Suppose the node template is:
     *
     * HTML
     * <div>
     *     Hello
     *     <!--$text$-->
     *     <span>
     *         <!--$text$-->
     *     </span>
     * </div>
     *
     * The fragment tree looks like this:
     *
     * root (DocumentFragment)
     *     0: DIV
     *         0: Text ("Hello\n ")
     *         1: Comment ("text")
     *         2: Text ("\n ")
     *         3: SPAN
     *             0: Comment ("text")
     *             1: Text ("\n")
     *
     * The path to the comment inside the SPAN is: [0, 3, 0]
     *
     * 0: first child of fragment (DIV)
     * 3: fourth child of DIV (SPAN)
     * 0: first child of SPAN (the comment node)
     *
     * When you traverse the nodes, you start at the root and walk:
     *
     * let node: Node = documentFragment;
     * for (const idx of path) {
     *     node = node.childNodes[idx];
     * }
     *
     * The resulting node is the node whose placeholder to replace or update.
     */

    const path = [];
    let testNode: Node | null = node;
    while (testNode !== null && testNode !== ancesterNode) {
        const parent: ParentNode | null = testNode.parentNode;
        if (!parent) {
            break;
        }
        const children = Array.from(parent.childNodes);
        path.unshift(children.indexOf(testNode as ChildNode));
        testNode = parent;
    }
    return path;
};
