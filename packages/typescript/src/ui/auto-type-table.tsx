import { TypeTable } from 'fumadocs-ui/components/type-table';
import { type Jsx, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as runtime from 'react/jsx-runtime';
import { renderMarkdownToHast } from '@/markdown';
import { type GenerateOptions, generateDocumentation } from '../generate/base';
import 'server-only';

/**
 * **Server Component Only**
 *
 * Display properties in an exported interface via Type Table
 */
export function AutoTypeTable({
  path,
  name,
  options,
}: {
  path: string;
  name: string;
  options?: GenerateOptions;
}): React.ReactElement {
  const output = generateDocumentation(path, name, options);

  if (!output) throw new Error(`${name} in ${path} doesn't exist`);

  return (
    <TypeTable
      type={Object.fromEntries(
        output.entries.map((entry) => [
          entry.name,
          {
            type: entry.type,
            description: renderMarkdown(entry.description),
            default: entry.tags.default || entry.tags.defaultValue,
          },
        ]),
      )}
    />
  );
}

function renderMarkdown(md: string): React.ReactElement {
  return toJsxRuntime(renderMarkdownToHast(md), {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx as Jsx,
    jsxs: runtime.jsxs as Jsx,
  });
}
