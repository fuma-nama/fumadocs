import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import picocolors from 'picocolors';
import { type Output } from '@/build/build-registry';
import { exists } from '@/utils/fs';

export * from './build-registry';
export * from './component-builder';

export async function writeOutput(
  dir: string,
  out: Output,
  options: {
    /**
     * Remove all content from the `dir` directory
     *
     * @defaultValue false
     */
    cleanDir?: boolean;

    log?: boolean;
  } = {},
): Promise<void> {
  const { log = true } = options;

  if (options.cleanDir && (await exists(dir))) {
    await fs.rm(dir, {
      recursive: true,
    });

    if (log) {
      console.log(picocolors.bold(picocolors.greenBright('Cleaned directory')));
    }
  }

  async function writeFile(file: string, content: string): Promise<void> {
    if (!log) return;

    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);

    const size = (Buffer.byteLength(content) / 1024).toFixed(2);
    console.log(
      `${picocolors.greenBright('+')} ${path.relative(process.cwd(), file)} ${picocolors.dim(`${size.toString()} KB`)}`,
    );
  }

  const write = out.components.map(async (comp) => {
    const file = path.join(dir, `${comp.name}.json`);
    const json = JSON.stringify(comp, null, 2);

    await writeFile(file, json);
  });

  async function writeIndex(): Promise<void> {
    const file = path.join(dir, '_registry.json');
    const json = JSON.stringify(out.index, null, 2);

    await writeFile(file, json);
  }

  write.push(writeIndex());
  await Promise.all(write);
}
