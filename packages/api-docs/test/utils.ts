import { ParsedSchema } from '@/schema';
import { dereferenceShallow } from '@/schema/dereference';
import { bundle } from '@/schema/bundle';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';

export async function fromSchema(input: string) {
  const bundled: ParsedSchema = await bundle(input);
  const dereferenced = createMagicProxy(bundled as Record<string, unknown>) as ParsedSchema;

  return {
    bundled,
    dereferenced,
    resolve<T>(node: T) {
      return dereferenceShallow(node);
    },
  };
}
