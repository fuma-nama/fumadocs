export function idToTitle(id: string): string {
  const result = [];
  for (const c of id) {
    if (result.length === 0) result.push(c.toLocaleUpperCase());
    else if (/^[A-Z]$/.test(c) && result.at(-1) !== ' ') result.push(' ', c);
    else if (c === '-') result.push(' ');
    else result.push(c);
  }

  return result.join('');
}
