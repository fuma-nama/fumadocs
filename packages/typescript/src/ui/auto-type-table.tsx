/// <reference types="react/experimental" />
import * as fs from 'node:fs/promises';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { type Jsx, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as runtime from 'react/jsx-runtime';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { renderMarkdownToHast } from '@/markdown';
import {
  generateDocumentation,
  type GenerateDocumentationOptions,
} from '@/generate/base';
import 'server-only';
import { getProject } from '@/get-project';
import type { ReactNode } from 'react';

export interface AutoTypeTableProps {
  /**
   * The path to source TypeScript file.
   */
  path?: string;

  /**
   * Exported type name to generate from.
   */
  name?: string;

  /**
   * Set the type to generate from.
   *
   * When used with `name`, it generates the type with `name` as export name.
   *
   * ```ts
   * export const myName = MyType;
   * ```
   *
   * When `type` contains multiple lines, `export const` is not added.
   * You need to export it manually, and specify the type name with `name`.
   *
   * ```tsx
   * <AutoTypeTable
   *   path="./file.ts"
   *   type={`import { ReactNode } from "react"
   *   export const MyName = ReactNode`}
   *   name="MyName"
   * />
   * ```
   */
  type?: string;

  /**
   * Override the function to render markdown into JSX nodes
   */
  renderMarkdown?: typeof renderMarkdownDefault;

  options?: GenerateDocumentationOptions;
}

export function createTypeTable(options: GenerateDocumentationOptions = {}): {
  AutoTypeTable: (
    props: Omit<AutoTypeTableProps, 'options'>,
  ) => React.ReactNode;
} {
  const project = options.project ?? getProject(options.config);

  return {
    AutoTypeTable(props) {
      return <AutoTypeTable {...props} options={{ ...options, project }} />;
    },
  };
}

/**
 * **Server Component Only**
 *
 * Display properties in an exported interface via Type Table
 */
export async function AutoTypeTable({
  path,
  name,
  type,
  renderMarkdown = renderMarkdownDefault,
  options = {},
}: AutoTypeTableProps): Promise<React.ReactElement> {
  let typeName = name;
  let content = '';

  if (path) {
    content = (await fs.readFile(path)).toString();
  }

  if (type && type.split('\n').length > 1) {
    content += `\n${type}`;
  } else if (type) {
    typeName ??= '$Fumadocs';
    content += `\nexport type ${typeName} = ${type}`;
  }

  const output = generateDocumentation(
    path ?? 'temp.ts',
    typeName,
    content,
    options,
  );

  if (name && output.length === 0)
    throw new Error(`${name} in ${path ?? 'empty file'} doesn't exist`);

  return (
    <>
      {output.map(async (item) => {
        const entries = item.entries.map(
          async (entry) =>
            [
              entry.name,
              {
                type: entry.type,
                description: await renderMarkdown(entry.description),
                default: entry.tags.default || entry.tags.defaultValue,
                required: entry.required,
              },
            ] as const,
        );

        return (
          <TypeTable
            key={item.name}
            type={Object.fromEntries(await Promise.all(entries))}
          />
        );
      })}
    </>
  );
}

async function renderMarkdownDefault(md: string): Promise<ReactNode> {
  return toJsxRuntime(await renderMarkdownToHast(md), {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx as Jsx,
    jsxs: runtime.jsxs as Jsx,
    components: { ...defaultMdxComponents, img: undefined },
  });
}
