import * as path from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { glob, type GlobOptions } from 'tinyglobby';
import { generateMDX, type GenerateMDXOptions } from './mdx';
import type { Generator } from '@/lib/base';

export interface GenerateFilesOptions {
  input: string | string[];
  /**
   * Output directory, or a function that returns the output path
   */
  output: string | ((inputPath: string) => string);
  globOptions?: GlobOptions;
  options?: GenerateMDXOptions;

  /**
   * @returns New content
   */
  transformOutput?: (path: string, content: string) => string;
}

export async function generateFiles(
  generator: Generator,
  options: GenerateFilesOptions,
): Promise<void> {
  const files = await glob(options.input, options.globOptions);

  const produce = files.map(async (file) => {
    const absolutePath = path.resolve(file);
    const outputPath =
      typeof options.output === 'function'
        ? options.output(file)
        : path.resolve(
            options.output,
            `${path.basename(file, path.extname(file))}.mdx`,
          );

    const content = (await readFile(absolutePath)).toString();
    let result = generateMDX(generator, content, {
      basePath: path.dirname(absolutePath),
      ...options.options,
    });

    if (options.transformOutput) {
      result = options.transformOutput(outputPath, result);
    }

    await write(outputPath, result);
    console.log(`Generated: ${outputPath}`);
  });

  await Promise.all(produce);
}

async function write(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}
