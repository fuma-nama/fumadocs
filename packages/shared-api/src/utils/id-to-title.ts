export function idToTitle(id: string): string {
  let result: string[] = [];

  for (const c of id) {
    if (result.length === 0) result.push(c.toLocaleUpperCase());
    // ignore the other parts surrounded with '.', like 'migrations.dev' -> 'dev'
    else if (c === '.') result = [];
    else if (/^[A-Z]$/.test(c) && result.at(-1) !== ' ') result.push(' ', c);
    else if (c === '-') result.push(' ');
    else result.push(c);
  }

  return result.join('');
}
