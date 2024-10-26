import { execa } from 'execa';
import type { JsonTreeNode } from '@/commands/file-tree';

export async function runTree(args: string): Promise<JsonTreeNode[]> {
  const out = await execa('tree', [args, '--gitignore', '--prune', '-J']);

  try {
    return JSON.parse(out.stdout) as JsonTreeNode[];
  } catch (e) {
    throw new Error('failed to run `tree` command', {
      cause: e,
    });
  }
}
