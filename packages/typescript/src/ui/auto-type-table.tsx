import { TypeTable } from 'fumadocs-ui/components/type-table';
import { renderMarkdown } from '@/markdown';
import type { Options } from '../generate';
import { generateDocumentation } from '../generate';
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
  options?: Options['options'];
}): JSX.Element {
  const output = generateDocumentation({ file: path, name, options });

  return (
    <TypeTable
      type={Object.fromEntries(
        output.map((entry) => [
          entry.name,
          {
            type: entry.type,
            description: renderMarkdown(entry.description),
            default: entry.default,
          },
        ]),
      )}
    />
  );
}
