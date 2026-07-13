import type { NoReferenceSwallow as NoReferenceShallow } from '.';
import { isPlainObject } from '../utils/is-plain-object';

/**
 * Resolve the `$ref` of a Reference Object (shallowly), merging sibling keywords into the target (sibling keywords take precedence).
 *
 * The input must be a node of a magic proxy (`@scalar/json-magic`), Reference Objects are resolved
 * with the virtual `$ref-value` property of the proxy.
 *
 * Returns non-reference values as-is.
 */
export function dereferenceShallow<T>(schema: T): NoReferenceShallow<T> {
  if (isPlainObject(schema)) {
    if (typeof schema.$ref !== 'string') return schema as never;

    // `$ref-value` is a virtual property added by the magic proxy, exclude it from sibling keywords
    const { $ref, '$ref-value': refValue, ...rest } = schema as Record<string, unknown>;
    const resolved = dereferenceShallow(refValue);

    if (typeof resolved !== 'object' || resolved === null)
      throw new Error(
        `Failed to resolve "${$ref}": the schema must be a node of magic proxy ("@scalar/json-magic").`,
      );
    if (Object.keys(rest).length === 0) return resolved as never;
    return { ...resolved, ...rest } as never;
  }

  return schema as never;
}
