import { bundle as bundleDocument } from '@scalar/json-magic/bundle';
import { fetchUrls, parseJson, parseYaml, readFiles } from '@scalar/json-magic/bundle/plugins/node';

/**
 * Resolve all external `$ref`s (file paths & URLs) in the document, and embed them into the `x-ext` section of document.
 *
 * The output document contains only in-document `$ref`s (e.g. `#/x-ext/.../schema`).
 *
 * Powered by `@scalar/json-magic`.
 */
export async function bundle<S extends object>(input: S | string): Promise<S> {
  const errors: string[] = [];

  const result = await bundleDocument(input as Record<string, unknown> | string, {
    plugins: [readFiles(), fetchUrls(), parseJson(), parseYaml()],
    treeShake: true,
    hooks: {
      onResolveError(node) {
        errors.push(String(node.$ref));
      },
    },
  });

  if (errors.length > 0) {
    throw new Error(`Failed to resolve $ref: ${errors.join(', ')}`);
  }

  return result as S;
}
