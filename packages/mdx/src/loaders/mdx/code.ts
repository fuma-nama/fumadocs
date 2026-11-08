import path from 'node:path';
import { createRequire } from 'node:module';
import { compileFunction } from 'node:vm';
import { buildSync } from 'esbuild';
import type { Params } from 'fumadocs-core/source';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxFromMarkdown, type MdxjsEsm } from 'mdast-util-mdx';
import { mdxjsEsm } from 'micromark-extension-mdxjs-esm';

type Statement = NonNullable<NonNullable<MdxjsEsm['data']>['estree']>['body'][number];
type ImportDeclaration = Extract<Statement, { type: 'ImportDeclaration' }>;

// only the ESM of MDX, the syntax of other plugins (e.g. math) stays text
const esm = mdxjsEsm({
  acorn: Parser.extend(acornJsx()),
  acornOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  addResult: true,
});

/** run a module in code synchronously, like a meta file in TypeScript */
export function runModule(
  file: string,
  contents: string,
  addDependency: (file: string) => void,
): Record<string, unknown> {
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
  for (const input in metafile.inputs)
    if (!input.startsWith('<')) addDependency(path.resolve(input));
  const module = { exports: {} as Record<string, unknown> };
  compileFunction(outputFiles[0].text, ['module', 'exports', 'require'], { filename: file })(
    module,
    module.exports,
    createRequire(file),
  );
  return module.exports;
}

/**
 * The frontmatter in the code of a page, `export const frontmatter = {...}`. It runs at build time with the imports it
 * reads, the statements before it in its ESM block and the params of a page as `props`, the content no longer has it.
 */
export function frontmatterCode(filePath: string, content: string) {
  if (!filePath.endsWith('.mdx') || !/^export const frontmatter\b/m.test(content)) return;
  const tree = fromMarkdown(content, { extensions: [esm], mdastExtensions: [mdxFromMarkdown()] });
  const imports: ImportDeclaration[] = [];
  for (const node of tree.children) {
    if (node.type !== 'mdxjsEsm' || !node.data?.estree) continue;
    let body = '';
    const declarations: unknown[] = [];
    for (const statement of node.data.estree.body) {
      if (statement.type === 'ImportDeclaration') imports.push(statement);
      // the declarations of exports run without `export`, like `export const name = ...`
      if (statement.type !== 'ExportNamedDeclaration' || !statement.declaration?.range) continue;
      const { declaration } = statement;
      body += `${content.slice(...statement.declaration.range)}\n`;
      declarations.push(declaration);
      if (
        declaration.type !== 'VariableDeclaration' ||
        !declaration.declarations.some(
          (item) => item.id.type === 'Identifier' && item.id.name === 'frontmatter',
        )
      )
        continue;

      // only the imports it reads, the others are for the content, like components
      const names = new Set<string>();
      collectNames(declarations, names);
      let code = '';
      for (const item of imports)
        if (item.range && item.specifiers.some((specifier) => names.has(specifier.local.name)))
          code += `${content.slice(...item.range)}\n`;

      const [start, end] = statement.range!;
      return {
        // the lines stay, for the line numbers of errors
        content:
          content.slice(0, start) +
          content.slice(start, end).replace(/[^\n]/g, '') +
          content.slice(end),
        /** compile it into a function of the params */
        compile(
          addDependency: (file: string) => void,
        ): (params?: Params) => Record<string, unknown> {
          return runModule(
            filePath,
            `${code}export const frontmatter = (props = {}) => {\n${body}return frontmatter;\n};`,
            addDependency,
          ).frontmatter as never;
        },
      };
    }
  }
}

function collectNames(node: unknown, out: Set<string>) {
  if (typeof node !== 'object' || node === null) return;
  if ('type' in node && node.type === 'Identifier' && 'name' in node) out.add(node.name as string);
  for (const value of Object.values(node)) collectNames(value, out);
}
