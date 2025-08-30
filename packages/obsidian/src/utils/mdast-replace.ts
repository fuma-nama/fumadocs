export function replace(node: object, withObj: object) {
  for (const k in node) {
    delete node[k as keyof object];
  }

  Object.assign(node, withObj);
}
