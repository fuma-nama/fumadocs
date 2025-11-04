import type { Generator } from 'fumadocs-typescript';
import type { AutoTypeTableProps } from 'fumadocs-typescript/ui';

let generator: Generator;

export async function AutoTypeTable(props: AutoTypeTableProps) {
  const { createGenerator } = await import('fumadocs-typescript');
  const { AutoTypeTable } = await import('fumadocs-typescript/ui');

  return (
    <AutoTypeTable generator={(generator ??= createGenerator())} {...props} />
  );
}
