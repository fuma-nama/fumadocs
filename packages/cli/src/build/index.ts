import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type Output } from '@/build/build-registry';

export * from './build-registry';
export * from './component-builder';

export async function writeOutput(dir: string, out: Output): Promise<void> {
  const write = out.components.map(async (comp) => {
    const file = path.join(dir, `${comp.name}.json`);

    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(comp, null, 2));
  });

  async function writeIndex(): Promise<void> {
    const file = path.join(dir, '_registry.json');

    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(out.index, null, 2));
  }

  write.push(writeIndex());
  await Promise.all(write);
}
