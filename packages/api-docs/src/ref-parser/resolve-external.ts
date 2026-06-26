import $Ref from './ref.js';
import Pointer from './pointer.js';
import parse from './parse.js';
import * as url from './util/url.js';
import { isHandledError } from './util/errors.js';
import { getSchemaBasePath } from './util/schema-resources.js';
import type $Refs from './refs.js';
import type { ParserOptions } from './options.js';
import type { JSONSchema } from './types/index.js';
import type { $RefParser } from './bundle.js';

/**
 * Crawls the JSON schema, finds all external JSON references, and resolves their values.
 * This method does not mutate the JSON schema. The resolved values are added to {@link $RefParser#$refs}.
 *
 * NOTE: We only care about EXTERNAL references here. INTERNAL references are only relevant when dereferencing.
 *
 * @returns
 * The promise resolves once all JSON references in the schema have been resolved,
 * including nested references that are contained in externally-referenced files.
 */
function resolveExternal<
  S extends object = JSONSchema,
  O extends ParserOptions<S> = ParserOptions<S>,
>(parser: $RefParser<S, O>, options: O) {
  if (!options.resolve?.external) {
    // Nothing to resolve, so exit early
    return Promise.resolve();
  }

  try {
    const rootScopeBase = parser.$refs._root$Ref.dynamicIdScope
      ? getSchemaBasePath(parser.$refs._root$Ref.path!, parser.schema)
      : parser.$refs._root$Ref.path!;
    // console.log('Resolving $ref pointers in %s', parser.$refs._root$Ref.path);
    const promises = crawl(
      parser.schema,
      parser.$refs._root$Ref.path + '#',
      rootScopeBase,
      parser.$refs._root$Ref.dynamicIdScope,
      parser.$refs,
      options,
    );
    return Promise.all(promises);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Recursively crawls the given value, and resolves any external JSON references.
 *
 * @param obj - The value to crawl. If it's not an object or array, it will be ignored.
 * @param path - The full path of `obj`, possibly with a JSON Pointer in the hash
 * @param {boolean} external - Whether `obj` was found in an external document.
 * @param $refs
 * @param options
 * @param seen - Internal.
 *
 * @returns
 * Returns an array of promises. There will be one promise for each JSON reference in `obj`.
 * If `obj` does not contain any JSON references, then the array will be empty.
 * If any of the JSON references point to files that contain additional JSON references,
 * then the corresponding promise will internally reference an array of promises.
 */
function crawl<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  obj: string | Buffer | S | undefined | null,
  path: string,
  scopeBase: string,
  dynamicIdScope: boolean,
  $refs: $Refs<S, O>,
  options: O,
  seen?: Set<any>,
  external?: boolean,
) {
  seen ||= new Set();
  let promises: any = [];

  if (obj && typeof obj === 'object' && !ArrayBuffer.isView(obj) && !seen.has(obj)) {
    seen.add(obj); // Track previously seen objects to avoid infinite recursion
    const currentScopeBase = scopeBase;
    if ($Ref.isExternal$Ref(obj)) {
      promises.push(resolve$Ref<S, O>(obj, path, currentScopeBase, dynamicIdScope, $refs, options));
    }

    const keys = Object.keys(obj) as string[];
    for (const key of keys) {
      const keyPath = Pointer.join(path, key);
      const value = obj[key as keyof typeof obj] as string | JSONSchema | Buffer | undefined;
      const childScopeBase =
        dynamicIdScope && value && typeof value === 'object' && !ArrayBuffer.isView(value)
          ? getSchemaBasePath(currentScopeBase, value)
          : currentScopeBase;
      promises = promises.concat(
        crawl(value, keyPath, childScopeBase, dynamicIdScope, $refs, options, seen, external),
      );
    }
  }

  return promises;
}

/**
 * Resolves the given JSON Reference, and then crawls the resulting value.
 *
 * @param $ref - The JSON Reference to resolve
 * @param path - The full path of `$ref`, possibly with a JSON Pointer in the hash
 * @param $refs
 * @param options
 *
 * @returns
 * The promise resolves once all JSON references in the object have been resolved,
 * including nested references that are contained in externally-referenced files.
 */
async function resolve$Ref<
  S extends object = JSONSchema,
  O extends ParserOptions<S> = ParserOptions<S>,
>(
  $ref: S,
  path: string,
  scopeBase: string,
  dynamicIdScope: boolean,
  $refs: $Refs<S, O>,
  options: O,
) {
  const resolutionBase = dynamicIdScope ? scopeBase : path;
  const resolvedPath = url.resolve(resolutionBase, ($ref as JSONSchema).$ref!);
  const withoutHash = url.stripHash(resolvedPath);

  // $ref.$ref = url.relative($refs._root$Ref.path, resolvedPath);

  // Do we already have this $ref?
  const ref = $refs._get$Ref(withoutHash);
  if (ref) {
    // We've already parsed this $ref, so use the existing value
    return Promise.resolve(ref.value);
  }

  // Parse the $referenced file/url
  try {
    const reference = ($ref as JSONSchema).$ref;
    const parseTarget: { url: string; baseUrl: string; reference?: string } = {
      url: resolvedPath,
      baseUrl: resolutionBase,
    };
    if (typeof reference === 'string') {
      parseTarget.reference = reference;
    }
    const result = await parse(parseTarget, $refs, options);

    // Crawl the parsed value
    // console.log('Resolving $ref pointers in %s', withoutHash);
    const parsedRef = $refs._get$Ref(withoutHash);
    const promises = crawl(
      result,
      withoutHash + '#',
      withoutHash,
      parsedRef?.dynamicIdScope ?? false,
      $refs,
      options,
      new Set(),
      true,
    );

    return Promise.all(promises);
  } catch (err) {
    if (!options?.continueOnError || !isHandledError(err)) {
      throw err;
    }

    if ($refs._$refs[withoutHash]) {
      err.source = decodeURI(url.stripHash(path));
      err.path = url.safePointerToPath(url.getHash(path));
    }

    return [];
  }
}
export default resolveExternal;
