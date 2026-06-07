import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compile, typegen } from 'fuma-translate';

export interface CompilePackageTranslationsOptions {
  /**
   * Working directory of the package.
   * @default process.cwd()
   */
  cwd?: string;
  /** Glob patterns relative to `cwd`. */
  input: string[];
  /**
   * Output path for generated types.
   * @default 'src/.translations/index.ts'
   */
  typesOutput?: string;
  /**
   * Output path for translation keys JSON.
   * @default 'src/.translations/keys.json'
   */
  jsonOutput?: string;

  extraKeys?: string[];
}

export async function compilePackageTranslations(
  options: CompilePackageTranslationsOptions,
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const typesOutput = path.resolve(cwd, options.typesOutput ?? 'src/.translations/index.ts');
  const jsonOutput = path.resolve(cwd, options.jsonOutput ?? 'src/.translations/keys.json');

  const output = await compile({
    input: options.input.map((pattern) => path.join(cwd, pattern)),
  });
  if (options.extraKeys) output.translationKeys.push(...options.extraKeys);

  await mkdir(path.dirname(typesOutput), { recursive: true });
  await writeFile(typesOutput, typegen(output), 'utf8');

  await mkdir(path.dirname(jsonOutput), { recursive: true });
  await writeFile(jsonOutput, `${JSON.stringify(output.translationKeys, null, 2)}\n`, 'utf8');

  console.log(`compiled ${output.translationKeys.length} translation keys`);
}
