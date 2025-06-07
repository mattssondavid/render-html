export const getNodeFromPathViaAncesterNode = (
    path: number[],
    ancesterNode: Node
): Node | null => {
    return path.reduce((accumulator: Node, currentValue: number): Node => {
        return accumulator.childNodes[currentValue];
    }, ancesterNode);
};
