import { spawn } from 'cross-spawn';
import type { JsonTreeNode } from '@/commands/file-tree';

export function runTree(args: string): Promise<JsonTreeNode[]> {
  return new Promise((res, reject) => {
    const child = spawn(`tree`, [args, '--gitignore', '--prune', '-J'], {
      cwd: process.cwd(),
    });

    let out: string | undefined;

    child.stdout.on('data', (d) => {
      out ??= '';
      out = out + String(d);
    });

    child.stderr.on('data', (d) => {
      reject(new Error(String(d)));
    });

    child.on('close', () => {
      if (!out) reject(new Error('failed to run `tree` command'));
      else res(JSON.parse(out) as JsonTreeNode[]);
    });

    child.on('error', reject);
  });
}
