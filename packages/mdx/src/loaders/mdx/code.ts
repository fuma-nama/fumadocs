import path from 'node:path';
import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compileFunction } from 'node:vm';
import { buildSync } from 'esbuild';
import type { Params } from 'fumadocs-core/source';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxFromMarkdown, type MdxjsEsm } from 'mdast-util-mdx';
import { mdxjsEsm } from 'micromark-extension-mdxjs-esm';
import { frontmatterModule } from '../../../../shared/frontmatter-code';

type Statement = NonNullable<NonNullable<MdxjsEsm['data']>['estree']>['body'][number];

// only the ESM of MDX, the syntax of other plugins (e.g. math) stays text
const esm = mdxjsEsm({
  acorn: Parser.extend(acornJsx()),
  acornOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  addResult: true,
});

/** the last run of each module: its code, the modification times of the files it read, its exports */
const modules = new Map<
  string,
  { contents: string; inputs: [string, number][]; exports: Record<string, unknown> }
>();

/**
 * Run a module in code synchronously, like a meta file in TypeScript. Every page of a dynamic folder reads its meta
 * file, it runs again only when it or a file it reads changes.
 */
export function runModule(
  file: string,
  contents: string,
  addDependency: (file: string) => void,
): Record<string, unknown> {
  const cached = modules.get(file);
  if (
    cached?.contents === contents &&
    cached.inputs.every(([input, time]) => mtime(input) === time)
  ) {
    for (const [input] of cached.inputs) addDependency(input);
    return cached.exports;
  }

  const { outputFiles, metafile } = buildSync({
    stdin: {
      contents,
      sourcefile: file,
      resolveDir: path.dirname(file),
      loader: file.endsWith('.mdx') ? 'tsx' : 'ts',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    packages: 'external',
    write: false,
    metafile: true,
  });
  const inputs: [string, number][] = [];
  for (const input in metafile.inputs) {
    if (input.startsWith('<')) continue;
    const resolved = path.resolve(input);
    addDependency(resolved);
    inputs.push([resolved, mtime(resolved)]);
  }
  const module = { exports: {} as Record<string, unknown> };
  compileFunction(outputFiles[0].text, ['module', 'exports', 'require'], { filename: file })(
    module,
    module.exports,
    createRequire(file),
  );
  modules.set(file, { contents, inputs, exports: module.exports });
  return module.exports;
}

function mtime(file: string): number {
  return statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? -1;
}

/**
 * The frontmatter in the code of a page, `export const frontmatter = {...}`. It runs at build time with the imports it
 * reads, the statements before it in its ESM block and the params of a page as `props`, the content no longer has it.
 */
export function frontmatterCode(filePath: string, content: string) {
  if (!filePath.endsWith('.mdx') || !/^export const frontmatter\b/m.test(content)) return;
  const tree = fromMarkdown(content, { extensions: [esm], mdastExtensions: [mdxFromMarkdown()] });
  const range = (node: Statement) => node.range!;
  const imports: [Statement, string][] = [];
  for (const node of tree.children)
    if (node.type === 'mdxjsEsm')
      for (const statement of node.data?.estree?.body ?? [])
        if (statement.type === 'ImportDeclaration')
          imports.push([statement, content.slice(...range(statement))]);
  for (const node of tree.children) {
    if (node.type !== 'mdxjsEsm' || !node.data?.estree) continue;
    const frontmatter = frontmatterModule(content, node.data.estree.body, imports, range);
    if (!frontmatter) continue;
    const [start, end] = frontmatter.remove;
    return {
      // the lines stay, for the line numbers of errors
      content:
        content.slice(0, start) +
        content.slice(start, end).replace(/[^\n]/g, '') +
        content.slice(end),
      /** compile it into a function of the params */
      compile(addDependency: (file: string) => void): (params?: Params) => Record<string, unknown> {
        return runModule(filePath, frontmatter.module, addDependency).frontmatter as never;
      },
    };
  }
}

/**
 * The frontmatter of a page, validated: the YAML with its frontmatter in code. A dynamic file has the frontmatter in
 * code of each params in `_frontmatterAt`.
 *
 * @param listed - whether to run the frontmatter in code of a dynamic file
 */
export async function resolveFrontmatter({
  code,
  yaml,
  staticParams,
  validate,
  addDependency,
  listed = true,
}: {
  code: ReturnType<typeof frontmatterCode>;
  yaml: Record<string, unknown>;
  staticParams: Params[] | undefined;
  validate: (data: Record<string, unknown>) => unknown;
  addDependency: (file: string) => void;
  listed?: boolean;
}): Promise<Record<string, unknown>> {
  if (!code || !staticParams) {
    const data = code ? { ...yaml, ...code.compile(addDependency)() } : yaml;
    return (await validate(data)) as Record<string, unknown>;
  }

  const frontmatterAt: Record<string, unknown> = {};
  if (listed) {
    const run = code.compile(addDependency);
    for (const item of staticParams)
      frontmatterAt[JSON.stringify(item)] = await validate({ ...yaml, ...run(item) });
  }
  return { ...yaml, _frontmatterAt: frontmatterAt };
}
