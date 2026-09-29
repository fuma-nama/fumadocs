import { bundle } from '@/bundle';
import { dereference, type JsonSchema } from '@/index';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';

export async function fromSchema(input: string) {
  const bundled: JsonSchema = await bundle(input);
  const dereferenced = createMagicProxy(bundled as Record<string, unknown>) as JsonSchema;

  return {
    bundled,
    dereferenced,
    resolve<T>(node: T) {
      return dereference(node);
    },
  };
}
