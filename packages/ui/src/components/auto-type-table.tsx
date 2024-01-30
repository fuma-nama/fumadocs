import { Options, generateDocumentation } from 'fumadocs-core/typescript';
import 'server-only';

declare const { TypeTable }: typeof import('./type-table');

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
            description: entry.description,
            default: entry.default,
          },
        ]),
      )}
    />
  );
}
