export function indent(code: string, tab: number = 1) {
  const prefix = '  '.repeat(tab);
  return code
    .split('\n')
    .map((v) => (v.length === 0 ? v : prefix + v))
    .join('\n');
}

export function dedent(code: string): string {
  const lines = code.split('\n');
  const minIndent = lines.reduce((min, line) => {
    const match = line.match(/^(\s*)\S/);
    return match ? Math.min(min, match[1].length) : min;
  }, Infinity);

  return minIndent === Infinity
    ? lines.join('\n')
    : lines.map((l) => l.slice(minIndent)).join('\n');
}
