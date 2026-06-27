import { NoReference, ParsedSchema } from '@/schema';
import { dereferenceSync } from '@/schema/dereference';
import { bundle } from '@/schema/bundle';

export async function fromSchema(input: string) {
  const bundled: ParsedSchema = await bundle(input);
  const dereferenceMap = new Map<object, string>();

  return {
    bundled,
    dereferenced: dereferenceSync(bundled, {
      setOriginalRef(schema, ref) {
        dereferenceMap.set(schema as object, ref);
      },
    }) as NoReference<ParsedSchema>,
    getRawRef(obj: object) {
      return dereferenceMap.get(obj);
    },
  };
}
