import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'cross-spawn';

const cache = new Map<string, Date>();

export function getGitTimestamp(file: string): Promise<Date | undefined> {
  const cachedTimestamp = cache.get(file);
  if (cachedTimestamp) return Promise.resolve(cachedTimestamp);

  return new Promise((resolve, reject) => {
    const cwd = path.dirname(file);
    if (!fs.existsSync(cwd)) {
      resolve(undefined);
      return;
    }
    const fileName = path.basename(file);
    const child = spawn('git', ['log', '-1', '--pretty="%ai"', fileName], {
      cwd,
    });

    let output: Date | undefined;
    child.stdout.on('data', (d) => (output = new Date(String(d))));
    child.on('close', () => {
      if (output) cache.set(file, output);
      resolve(output);
    });
    child.on('error', reject);
  });
}
