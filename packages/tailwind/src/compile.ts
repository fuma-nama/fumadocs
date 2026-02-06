import { Scanner, SourceEntry } from '@tailwindcss/oxide';

export function compile(sources: SourceEntry[]) {
  const scanner = new Scanner({
    sources,
  });

  const lines: string[] = [];
  const names = scanner.scan();
  for (const name of names) {
    lines.push(`@source inline(${JSON.stringify(name)});`);
  }
  return lines.join('\n');
}
