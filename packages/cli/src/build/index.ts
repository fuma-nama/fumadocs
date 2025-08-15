import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import picocolors from 'picocolors';
import { type Output } from '@/build/build-registry';
import { toShadcnRegistry } from '@/build/shadcn';
import { validateOutput } from '@/build/validate';

export * from './build-registry';
export * from './component-builder';
export * from './shadcn';

export function combineRegistry(...items: Output[]): Output {
  const out: Output = {
    index: [],
    components: [],
    name: items[0].name,
  };

  for (const item of items) {
    out.components.push(...item.components);
    out.index.push(...item.index);
  }

  validateOutput(out);
  return out;
}

export async function writeShadcnRegistry(
  out: Output,
  options: {
    dir: string;
    /**
     * Remove previous outputs
     *
     * @defaultValue false
     */
    cleanDir?: boolean;

    baseUrl: string;
  },
) {
  const { dir, cleanDir = false, baseUrl } = options;

  if (cleanDir) {
    await fs.rm(dir, {
      recursive: true,
      force: true,
    });
    console.log(picocolors.bold(picocolors.greenBright('Cleaned directory')));
  }

  await Promise.all(
    toShadcnRegistry(out, baseUrl).items.map(async (item) => {
      const file = path.join(dir, `${item.name}.json`);

      await writeFile(file, JSON.stringify(item, null, 2));
    }),
  );
}

export async function writeFumadocsRegistry(
  out: Output,
  options: {
    dir: string;

    /**
     * Remove previous outputs
     *
     * @defaultValue false
     */
    cleanDir?: boolean;

    log?: boolean;
  },
): Promise<void> {
  const { dir, cleanDir = false, log = true } = options;

  if (cleanDir) {
    await fs.rm(dir, {
      recursive: true,
      force: true,
    });
    console.log(picocolors.bold(picocolors.greenBright('Cleaned directory')));
  }

  async function writeIndex() {
    const file = path.join(dir, '_registry.json');
    const json = JSON.stringify(out.index, null, 2);

    await writeFile(file, json, log);
  }

  const write = out.components.map(async (comp) => {
    const file = path.join(dir, `${comp.name}.json`);
    const json = JSON.stringify(comp, null, 2);

    await writeFile(file, json, log);
  });

  write.push(writeIndex());
  await Promise.all(write);
}

async function writeFile(
  file: string,
  content: string,
  log = true,
): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);

  if (log) {
    const size = (Buffer.byteLength(content) / 1024).toFixed(2);

    console.log(
      `${picocolors.greenBright('+')} ${path.relative(process.cwd(), file)} ${picocolors.dim(`${size} KB`)}`,
    );
  }
}
