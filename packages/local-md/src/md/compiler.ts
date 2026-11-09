import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { plugin, plugins } from './utils';
import { remarkHeading, type RemarkHeadingOptions } from 'fumadocs-core/mdx-plugins/remark-heading';
import { remarkNpm, type RemarkNpmOptions } from 'fumadocs-core/mdx-plugins/remark-npm';
import {
  remarkCodeTab,
  type RemarkCodeTabOptions,
} from 'fumadocs-core/mdx-plugins/remark-code-tab';
import { rehypeCode, type RehypeCodeOptions } from 'fumadocs-core/mdx-plugins/rehype-code';
import { rehypeToc, type RehypeTocOptions } from 'fumadocs-core/mdx-plugins/rehype-toc';
import { remarkStructure, type StructureOptions } from 'fumadocs-core/mdx-plugins/remark-structure';
import { remarkInclude, type RemarkIncludeOptions } from 'fumadocs-core/mdx-plugins/remark-include';
import { remarkShow } from 'fumadocs-core/mdx-plugins/remark-show';
import { Compatible, VFile } from 'vfile';
import type { Root } from 'hast';
import * as Mdx from '@mdx-js/mdx';
import { remark } from 'remark';
import type { PluggableList } from 'unified';
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype';
import type { AssignmentProperty, ImportSpecifier } from 'estree';
import { headingRuntime } from '../../../shared/heading-id';

export interface MarkdownCompilerOptions {
  mdOptions?: MarkdownProcessorOptions;
  mdxOptions?: MDXProcessorOptions;
}

export interface MarkdownProcessorOptions {
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  remarkRehypeOptions?: RemarkRehypeOptions;

  remarkStructureOptions?: StructureOptions | false;
  remarkHeadingOptions?: RemarkHeadingOptions | false;
  remarkCodeTabOptions?: RemarkCodeTabOptions | false;
  remarkNpmOptions?: RemarkNpmOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
  rehypeTocOptions?: RehypeTocOptions | false;
}

export interface MDXProcessorOptions extends Mdx.ProcessorOptions {
  remarkStructureOptions?: StructureOptions | false;
  remarkHeadingOptions?: RemarkHeadingOptions | false;
  remarkCodeTabOptions?: RemarkCodeTabOptions | false;
  remarkNpmOptions?: RemarkNpmOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
  rehypeTocOptions?: RehypeTocOptions | false;
}

export interface MarkdownCompiler {
  compile: (input: Compatible) => Promise<CompileResult>;
}

export type CompileResult =
  | {
      type: 'ast';
      tree: Root;
      file: VFile;
    }
  | {
      type: 'js';
      file: VFile;
      code: string;
    };

export function createMarkdownCompiler(options?: MarkdownCompilerOptions): MarkdownCompiler {
  let mdx: ReturnType<typeof createMdxCompiler> | undefined;
  let md: ReturnType<typeof createMdCompiler> | undefined;
  // included files are parsed by the processor of their format
  const getProcessor: RemarkIncludeOptions['getProcessor'] = (format) =>
    format === 'mdx' ? (mdx ??= createMdxCompiler()) : (md ??= createMdCompiler());

  function createMdCompiler() {
    const {
      remarkHeadingOptions,
      rehypeCodeOptions,
      rehypePlugins,
      rehypeTocOptions,
      remarkCodeTabOptions,
      remarkNpmOptions,
      remarkPlugins,
      remarkRehypeOptions,
      remarkStructureOptions,
    } = options?.mdOptions ?? {};

    return remark()
      .use(
        plugins(
          plugin(remarkInclude, { getProcessor }),
          remarkGfm,
          remarkHeadingOptions !== false &&
            plugin(remarkHeading, { generateToc: false, ...remarkHeadingOptions }),
          remarkNpmOptions !== false && plugin(remarkNpm, remarkNpmOptions),
          remarkCodeTabOptions !== false && plugin(remarkCodeTab, remarkCodeTabOptions),
          ...(remarkPlugins ?? []),
          remarkStructureOptions !== false && plugin(remarkStructure, remarkStructureOptions),
        ),
      )
      .use(remarkRehype, {
        passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement'],
        ...remarkRehypeOptions,
      })
      .use(
        plugins(
          rehypeCodeOptions !== false && plugin(rehypeCode, rehypeCodeOptions),
          ...(rehypePlugins ?? []),
          rehypeTocOptions !== false &&
            plugin(rehypeToc, { exportToc: { as: 'data' }, ...rehypeTocOptions }),
        ),
      );
  }

  function createMdxCompiler() {
    const {
      remarkCodeTabOptions,
      remarkHeadingOptions,
      remarkNpmOptions,
      remarkStructureOptions,
      rehypeCodeOptions,
      rehypeTocOptions,
      remarkPlugins,
      rehypePlugins,
      ...mdxOptions
    } = options?.mdxOptions ?? {};

    return Mdx.createProcessor({
      ...mdxOptions,
      outputFormat: 'function-body',
      development: false,
      remarkPlugins: plugins(
        plugin(remarkInclude, { getProcessor }),
        remarkShow,
        remarkGfm,
        remarkHeadingOptions !== false &&
          plugin(remarkHeading, { generateToc: false, ...remarkHeadingOptions }),
        remarkNpmOptions !== false && plugin(remarkNpm, remarkNpmOptions),
        remarkCodeTabOptions !== false && plugin(remarkCodeTab, remarkCodeTabOptions),
        ...(remarkPlugins ?? []),
        remarkStructureOptions !== false &&
          plugin(remarkStructure, { exportAs: 'structuredData', ...remarkStructureOptions }),
      ),
      rehypePlugins: plugins(
        rehypeCodeOptions !== false && plugin(rehypeCode, rehypeCodeOptions),
        ...(rehypePlugins ?? []),
        rehypeTocOptions !== false &&
          plugin(rehypeToc, { exportToc: { as: 'esm', name: 'toc' }, ...rehypeTocOptions }),
        rehypeRuntime,
      ),
    });
  }

  return {
    async compile(input) {
      const file = new VFile(input);
      if (file.extname === '.mdx') {
        mdx ??= createMdxCompiler();
        const out = await mdx.process(file);
        return {
          type: 'js',
          file,
          code: String(out.value),
        };
      }

      md ??= createMdCompiler();
      const tree = await md.run(md.parse(file), file);
      return {
        type: 'ast',
        tree,
        file,
      };
    },
  };
}

/**
 * Like the JSX runtime, the body reads the runtime of generated code from `arguments[0]`: imports of function bodies
 * are dynamic, which synchronous rendering and browsers can't run.
 */
function rehypeRuntime() {
  return (tree: Root) => {
    for (const node of tree.children) {
      const body = node.type === 'mdxjsEsm' ? node.data?.estree?.body : undefined;
      const statement = body?.[0];
      if (statement?.type !== 'ImportDeclaration' || statement.source.value !== headingRuntime)
        continue;
      const properties: AssignmentProperty[] = [];
      for (const { imported, local } of statement.specifiers as ImportSpecifier[])
        properties.push({
          type: 'Property',
          kind: 'init',
          key: imported,
          value: local,
          method: false,
          shorthand: false,
          computed: false,
        });
      body![0] = {
        type: 'VariableDeclaration',
        kind: 'const',
        declarations: [
          {
            type: 'VariableDeclarator',
            id: { type: 'ObjectPattern', properties },
            init: {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'arguments' },
              property: { type: 'Literal', value: 0 },
              computed: true,
              optional: false,
            },
          },
        ],
      };
    }
  };
}
