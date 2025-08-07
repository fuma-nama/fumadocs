import type { Processor, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { Code, Root, RootContent } from 'mdast';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { CompilerOptions } from '@/utils/build-mdx';
import { fumaMatter } from '@/utils/fuma-matter';

function flattenNode(node: RootContent): string {
  if ('children' in node)
    return node.children.map((child) => flattenNode(child)).join('');

  if ('value' in node) return node.value;

  return '';
}

function parseSpecifier(specifier: string): {
  file: string;
  section?: string;
} {
  const idx = specifier.lastIndexOf('#');
  if (idx === -1) return { file: specifier };

  return {
    file: specifier.slice(0, idx),
    section: specifier.slice(idx + 1),
  };
}

// do a swallow extract
function extractSection(root: Root, section: string): Root | undefined {
  for (const node of root.children) {
    if (
      node.type === 'mdxJsxFlowElement' &&
      node.name === 'section' &&
      node.attributes.some(
        (attr) =>
          attr.type === 'mdxJsxAttribute' &&
          attr.name === 'id' &&
          attr.value === section,
      )
    ) {
      return {
        type: 'root',
        children: node.children,
      };
    }
  }
}

export function remarkInclude(this: Processor): Transformer<Root, Root> {
  const TagName = 'include';

  async function update(
    tree: Root,
    directory: string,
    processor: Processor,
    compiler?: CompilerOptions,
  ) {
    const queue: Promise<void>[] = [];

    visit(
      tree,
      ['mdxJsxFlowElement', 'mdxJsxTextElement'],
      (node, _, parent) => {
        let specifier: string | undefined;
        const params: Record<string, string | null> = {};

        if (
          (node.type === 'mdxJsxFlowElement' ||
            node.type === 'mdxJsxTextElement') &&
          node.name === TagName
        ) {
          const value = flattenNode(node);

          if (value.length > 0) {
            for (const attr of node.attributes) {
              if (
                attr.type === 'mdxJsxAttribute' &&
                (typeof attr.value === 'string' || attr.value === null)
              ) {
                params[attr.name] = attr.value;
              }
            }

            specifier = value;
          }
        }

        if (!specifier) return;
        const { file, section } = parseSpecifier(specifier);

        const targetPath = path.resolve(
          'cwd' in params ? process.cwd() : directory,
          file,
        );
        const asCode =
          params.lang || (!file.endsWith('.md') && !file.endsWith('.mdx'));

        queue.push(
          fs
            .readFile(targetPath)
            .then((buffer) => buffer.toString())
            .then(async (content) => {
              compiler?.addDependency(targetPath);

              if (asCode) {
                const lang = params.lang ?? path.extname(file).slice(1);

                Object.assign(node, {
                  type: 'code',
                  lang,
                  meta: params.meta,
                  value: content,
                  data: {},
                } satisfies Code);
                return;
              }

              let parsed = processor.parse(fumaMatter(content).content) as Root;
              if (section) {
                const extracted = extractSection(parsed, section);
                if (!extracted)
                  throw new Error(
                    `Cannot find section ${section} in ${file}, make sure you have encapsulated the section in a <section id="${section}"> tag`,
                  );

                parsed = extracted;
              }

              await update(
                parsed,
                path.dirname(targetPath),
                processor,
                compiler,
              );
              Object.assign(
                parent && parent.type === 'paragraph' ? parent : node,
                parsed,
              );
            })
            .catch((e) => {
              throw new Error(
                `failed to read file ${targetPath}\n${e instanceof Error ? e.message : String(e)}`,
                { cause: e },
              );
            }),
        );

        return 'skip';
      },
    );

    await Promise.all(queue);
  }

  return async (tree, file) => {
    await update(tree, path.dirname(file.path), this, file.data._compiler);
  };
}
