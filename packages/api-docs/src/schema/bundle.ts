import { bundle as bundleDocument, type LoaderPlugin } from '@scalar/json-magic/bundle';
import { fetchUrls, parseJson, parseYaml, readFiles } from '@scalar/json-magic/bundle/plugins/node';

export interface BundleOptions {
  /**
   * Transform each document before bundling embeds it: the input document itself, and every referenced external document.
   */
  transform?: (document: unknown) => unknown;
}

/**
 * Resolve all external `$ref`s (file paths & URLs) in the document, and embed them into the `x-ext` section of document.
 *
 * The output document contains only in-document `$ref`s (e.g. `#/x-ext/.../schema`).
 *
 * Powered by `@scalar/json-magic`.
 */
export async function bundle<S extends object>(
  input: S | string,
  { transform }: BundleOptions = {},
): Promise<S> {
  const errors: string[] = [];
  let plugins: LoaderPlugin[] = [readFiles(), fetchUrls(), parseJson(), parseYaml()];

  if (transform) {
    if (typeof input !== 'string') input = transform(input) as S;
    plugins = plugins.map((plugin) => ({
      ...plugin,
      async exec(value) {
        const result = await plugin.exec(value);
        return result.ok ? { ...result, data: transform(result.data) } : result;
      },
    }));
  }

  const result = await bundleDocument(input as Record<string, unknown> | string, {
    plugins,
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
