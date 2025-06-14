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

export function remarkInclude(this: Processor): Transformer<Root, Root> {
  const TagName = 'include';

  async function update(
    tree: Root,
    file: string,
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

        const targetPath = path.resolve(
          'cwd' in params ? process.cwd() : path.dirname(file),
          specifier,
        );
        const asCode =
          params.lang ||
          (!specifier.endsWith('.md') && !specifier.endsWith('.mdx'));

        queue.push(
          fs
            .readFile(targetPath)
            .then((buffer) => buffer.toString())
            .then(async (content) => {
              compiler?.addDependency(targetPath);

              if (asCode) {
                const lang = params.lang ?? path.extname(specifier).slice(1);

                Object.assign(node, {
                  type: 'code',
                  lang,
                  meta: params.meta,
                  value: content.toString(),
                  data: {},
                } satisfies Code);
                return;
              }

              const parsed = processor.parse(fumaMatter(content).content);

              await update(parsed as Root, targetPath, processor, compiler);
              Object.assign(
                parent && parent.type === 'paragraph' ? parent : node,
                parsed,
              );
            })
            .catch((e) => {
              throw new Error(
                `failed to read file ${targetPath}\n${e instanceof Error ? e.message : String(e)}`,
              );
            }),
        );

        return 'skip';
      },
    );

    await Promise.all(queue);
  }

  return async (tree, file) => {
    await update(tree, file.path, this, file.data._compiler);
  };
}
