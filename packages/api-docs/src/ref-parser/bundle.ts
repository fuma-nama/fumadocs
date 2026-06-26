import $Refs from './refs.js';
import _parse from './parse.js';
import normalizeArgs from './normalize-args.js';
import resolveExternal from './resolve-external.js';
import $Ref from './ref.js';
import Pointer from './pointer.js';
import * as url from './util/url.js';
import maybe from './util/maybe.js';
import {
  getSchemaBasePath,
  registerSchemaResources,
  usesDynamicIdScope,
} from './util/schema-resources.js';
import { JSONParserErrorGroup, isHandledError } from './util/errors.js';
import type { ParserOptions, BundleOptions } from './options.js';
import type { JSONSchema, SchemaCallback } from './types/index.js';

export type { JSONSchema, SchemaCallback } from './types/index.js';
export type { ParserOptions, BundleOptions } from './options.js';

/**
 * Internal parser state used by the bundle pipeline.
 */
export class $RefParser<
  S extends object = JSONSchema,
  O extends ParserOptions<S> = ParserOptions<S>,
> {
  schema: S | null = null;
  $refs = new $Refs<S, O>();

  async parse(path: string, schema: S | undefined, options: O): Promise<S | null> {
    this.schema = null;
    this.$refs = new $Refs();

    if (!path && !schema) {
      throw new Error(`Expected a file path or object. Got ${path || schema}`);
    }

    let pathType = 'file';
    if (path && url.isFileSystemPath(path)) {
      path = url.fromFileSystemPath(path);
    }

    path = url.resolve(url.cwd(), path || '');

    if (schema && typeof schema === 'object') {
      const $ref = this.$refs._add(path);
      $ref.value = schema;
      $ref.pathType = pathType;
      $ref.dynamicIdScope = usesDynamicIdScope($ref.value);
      registerSchemaResources(
        this.$refs,
        $ref.path!,
        $ref.value,
        $ref.pathType,
        $ref.dynamicIdScope,
      );
      this.schema = schema;
      return schema;
    }

    try {
      const result = await _parse<S, O>(path, this.$refs, options);

      if (result !== null && typeof result === 'object' && !Buffer.isBuffer(result)) {
        this.schema = result;
        return this.schema;
      }

      throw new SyntaxError(`"${this.$refs._root$Ref.path || result}" is not a valid JSON Schema`);
    } catch (err) {
      if (!options.continueOnError || !isHandledError(err)) {
        throw err;
      }

      if (this.$refs._$refs[url.stripHash(path)]) {
        this.$refs._$refs[url.stripHash(path)].addError(err);
      }

      this.schema = null;
      return null;
    }
  }

  async resolve(path: string, schema: S | undefined, options: O): Promise<$Refs<S, O>> {
    await this.parse(path, schema, options);
    await resolveExternal(this, options);
    finalize(this);
    return this.$refs;
  }

  async runBundle(
    path: string,
    schema: S | undefined,
    options: O,
    callback?: SchemaCallback<S>,
  ): Promise<S | void> {
    try {
      await this.resolve(path, schema, options);
      inlineRefs(this, options);
      finalize(this);
      return maybe(callback, Promise.resolve(this.schema!)) as S | void;
    } catch (err) {
      return maybe(callback, Promise.reject(err)) as S | void;
    }
  }
}

function finalize<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  parser: $RefParser<S, O>,
) {
  const errors = JSONParserErrorGroup.getParserErrors(parser);
  if (errors.length > 0) {
    throw new JSONParserErrorGroup(parser);
  }
}

export async function bundle<S extends object = JSONSchema>(
  schema: S | string,
  options?: ParserOptions<S>,
): Promise<S>;
export async function bundle<S extends object = JSONSchema>(
  schema: S | string,
  callback: SchemaCallback<S>,
): Promise<void>;
export async function bundle<
  S extends object = JSONSchema,
  O extends ParserOptions<S> = ParserOptions<S>,
>(schema: S | string, options: O, callback: SchemaCallback<S>): Promise<void>;
export async function bundle<
  S extends object = JSONSchema,
  O extends ParserOptions<S> = ParserOptions<S>,
>(path: string, schema: S | string, options: O): Promise<S>;
export async function bundle<
  S extends object = JSONSchema,
  O extends ParserOptions<S> = ParserOptions<S>,
>(
  path: string,
  schema: S | string,
  options: O,
  callback: SchemaCallback<S>,
): Promise<void>;
export async function bundle(): Promise<unknown> {
  const args = normalizeArgs(arguments);
  const parser = new $RefParser();
  return parser.runBundle(args.path, args.schema, args.options, args.callback);
}

export interface InventoryEntry {
  $ref: any;
  parent: any;
  key: any;
  pathFromRoot: any;
  depth: any;
  file: any;
  hash: any;
  value: any;
  circular: any;
  extended: any;
  external: any;
  nestedResource: boolean;
  indirections: any;
}
/**
 * Bundles all external JSON references into the main JSON schema, thus resulting in a schema that
 * only has *internal* references, not any *external* references.
 * This method mutates the JSON schema object, adding new references and re-mapping existing ones.
 *
 * @param parser
 * @param options
 */
function inlineRefs<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  parser: $RefParser<S, O>,
  options: O,
) {
  // console.log('Bundling $ref pointers in %s', parser.$refs._root$Ref.path);
  const rootScopeBase = parser.$refs._root$Ref.dynamicIdScope
    ? getSchemaBasePath(parser.$refs._root$Ref.path!, parser.schema)
    : parser.$refs._root$Ref.path!;

  // Build an inventory of all $ref pointers in the JSON Schema
  const inventory: InventoryEntry[] = [];
  crawl<S, O>(
    parser,
    'schema',
    parser.$refs._root$Ref.path + '#',
    rootScopeBase,
    parser.$refs._root$Ref.dynamicIdScope,
    '#',
    0,
    inventory,
    parser.$refs,
    options,
  );

  // Get the root schema's $id (if any) for qualifying refs inside sub-schemas with their own $id
  const rootId =
    parser.schema && typeof parser.schema === 'object' && '$id' in (parser.schema as any)
      ? (parser.schema as any).$id
      : undefined;

  // Remap all $ref pointers
  remap<S, O>(inventory, options, rootId);

  // Fix any $ref paths that traverse through other $refs (which is invalid per JSON Schema spec)
  const bundleOptions = (options.bundle || {}) as BundleOptions;
  if (bundleOptions.optimizeInternalRefs !== false) {
    fixRefsThroughRefs(inventory, parser.schema as any);
  }
}

/**
 * Recursively crawls the given value, and inventories all JSON references.
 *
 * @param parent - The object containing the value to crawl. If the value is not an object or array, it will be ignored.
 * @param key - The property key of `parent` to be crawled
 * @param path - The full path of the property being crawled, possibly with a JSON Pointer in the hash
 * @param pathFromRoot - The path of the property being crawled, from the schema root
 * @param indirections
 * @param inventory - An array of already-inventoried $ref pointers
 * @param $refs
 * @param options
 */
function crawl<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  parent: object | $RefParser<S, O>,
  key: string | null,
  path: string,
  scopeBase: string,
  dynamicIdScope: boolean,
  pathFromRoot: string,
  indirections: number,
  inventory: InventoryEntry[],
  $refs: $Refs<S, O>,
  options: O,
) {
  const obj = key === null ? parent : parent[key as keyof typeof parent];
  const bundleOptions = (options.bundle || {}) as BundleOptions;
  const isExcludedPath = bundleOptions.excludedPathMatcher || (() => false);

  if (obj && typeof obj === 'object' && !ArrayBuffer.isView(obj) && !isExcludedPath(pathFromRoot)) {
    const currentScopeBase = scopeBase;
    if ($Ref.isAllowed$Ref(obj)) {
      inventory$Ref(
        parent,
        key,
        path,
        currentScopeBase,
        dynamicIdScope,
        pathFromRoot,
        indirections,
        inventory,
        $refs,
        options,
      );
    } else {
      // Crawl the object in a specific order that's optimized for bundling.
      // This is important because it determines how `pathFromRoot` gets built,
      // which later determines which keys get dereferenced and which ones get remapped
      const keys = Object.keys(obj).sort((a, b) => {
        // Most people will expect references to be bundled into the the "definitions" property,
        // so we always crawl that property first, if it exists.
        if (a === 'definitions' || a === '$defs') {
          return -1;
        } else if (b === 'definitions' || b === '$defs') {
          return 1;
        } else {
          // Otherwise, crawl the keys based on their length.
          // This produces the shortest possible bundled references
          return a.length - b.length;
        }
      }) as (keyof typeof obj)[];

      for (const key of keys) {
        const keyPath = Pointer.join(path, key);
        const keyPathFromRoot = Pointer.join(pathFromRoot, key);
        const value = obj[key];
        const childScopeBase =
          dynamicIdScope && value && typeof value === 'object' && !ArrayBuffer.isView(value)
            ? getSchemaBasePath(currentScopeBase, value)
            : currentScopeBase;

        if ($Ref.isAllowed$Ref(value)) {
          inventory$Ref(
            obj,
            key,
            keyPath,
            childScopeBase,
            dynamicIdScope,
            keyPathFromRoot,
            indirections,
            inventory,
            $refs,
            options,
          );
        } else {
          crawl(
            obj,
            key,
            keyPath,
            childScopeBase,
            dynamicIdScope,
            keyPathFromRoot,
            indirections,
            inventory,
            $refs,
            options,
          );
        }

        // We need to ensure that we have an object to work with here because we may be crawling
        // an `examples` schema and `value` may be nullish.
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if ('$ref' in value) {
            bundleOptions?.onBundle?.(value['$ref'], obj[key], obj as any, key);
          }
        }
      }
    }
  }
}

/**
 * Inventories the given JSON Reference (i.e. records detailed information about it so we can
 * optimize all $refs in the schema), and then crawls the resolved value.
 *
 * @param $refParent - The object that contains a JSON Reference as one of its keys
 * @param $refKey - The key in `$refParent` that is a JSON Reference
 * @param path - The full path of the JSON Reference at `$refKey`, possibly with a JSON Pointer in the hash
 * @param indirections - unknown
 * @param pathFromRoot - The path of the JSON Reference at `$refKey`, from the schema root
 * @param inventory - An array of already-inventoried $ref pointers
 * @param $refs
 * @param options
 */
function inventory$Ref<
  S extends object = JSONSchema,
  O extends ParserOptions<S> = ParserOptions<S>,
>(
  $refParent: any,
  $refKey: string | null,
  path: string,
  scopeBase: string,
  dynamicIdScope: boolean,
  pathFromRoot: string,
  indirections: number,
  inventory: InventoryEntry[],
  $refs: $Refs<S, O>,
  options: O,
) {
  const $ref = $refKey === null ? $refParent : $refParent[$refKey];
  const $refPath = url.resolve(dynamicIdScope ? scopeBase : path, $ref.$ref);
  const pointer = $refs._resolve($refPath, pathFromRoot, options);
  if (pointer === null) {
    return;
  }
  const parsed = Pointer.parse(pathFromRoot);
  const depth = parsed.length;
  const file = url.stripHash(pointer.path);
  const hash = url.getHash(pointer.path);
  const external = file !== $refs._root$Ref.path && !$refs._aliases[file];
  const nestedResource =
    Boolean($refs._aliases[file]) && pointer.$ref.value !== $refs._root$Ref.value;
  const extended = $Ref.isExtended$Ref($ref);
  indirections += pointer.indirections;

  const existingEntry = findInInventory(inventory, $refParent, $refKey);
  if (existingEntry) {
    // This $Ref has already been inventoried, so we don't need to process it again
    if (depth < existingEntry.depth || indirections < existingEntry.indirections) {
      removeFromInventory(inventory, existingEntry);
    } else {
      return;
    }
  }

  inventory.push({
    $ref, // The JSON Reference (e.g. {$ref: string})
    parent: $refParent, // The object that contains this $ref pointer
    key: $refKey, // The key in `parent` that is the $ref pointer
    pathFromRoot, // The path to the $ref pointer, from the JSON Schema root
    depth, // How far from the JSON Schema root is this $ref pointer?
    file, // The file that the $ref pointer resolves to
    hash, // The hash within `file` that the $ref pointer resolves to
    value: pointer.value, // The resolved value of the $ref pointer
    circular: pointer.circular, // Is this $ref pointer DIRECTLY circular? (i.e. it references itself)
    extended, // Does this $ref extend its resolved value? (i.e. it has extra properties, in addition to "$ref")
    external, // Does this $ref pointer point to a file other than the main JSON Schema file?
    nestedResource, // Does this $ref resolve to an embedded schema resource with its own $id?
    indirections, // The number of indirect references that were traversed to resolve the value
  });

  // Recursively crawl the resolved value
  if (!existingEntry || external) {
    crawl(
      pointer.value,
      null,
      pointer.path,
      pointer.$ref.path!,
      pointer.$ref.dynamicIdScope,
      pathFromRoot,
      indirections + 1,
      inventory,
      $refs,
      options,
    );
  }
}

/**
 * Re-maps every $ref pointer, so that they're all relative to the root of the JSON Schema.
 * Each referenced value is dereferenced EXACTLY ONCE.  All subsequent references to the same
 * value are re-mapped to point to the first reference.
 *
 * @example: {
 *    first: { $ref: somefile.json#/some/part },
 *    second: { $ref: somefile.json#/another/part },
 *    third: { $ref: somefile.json },
 *    fourth: { $ref: somefile.json#/some/part/sub/part }
 *  }
 *
 * In this example, there are four references to the same file, but since the third reference points
 * to the ENTIRE file, that's the only one we need to dereference.  The other three can just be
 * remapped to point inside the third one.
 *
 * On the other hand, if the third reference DIDN'T exist, then the first and second would both need
 * to be dereferenced, since they point to different parts of the file. The fourth reference does NOT
 * need to be dereferenced, because it can be remapped to point inside the first one.
 *
 * @param inventory
 */
function remap<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(
  inventory: InventoryEntry[],
  options: O,
  rootId?: string,
) {
  // Group & sort all the $ref pointers, so they're in the order that we need to dereference/remap them
  inventory.sort((a: InventoryEntry, b: InventoryEntry) => {
    if (a.file !== b.file) {
      // Group all the $refs that point to the same file
      return a.file < b.file ? -1 : +1;
    } else if (a.hash !== b.hash) {
      // Group all the $refs that point to the same part of the file
      return a.hash < b.hash ? -1 : +1;
    } else if (a.circular !== b.circular) {
      // If the $ref points to itself, then sort it higher than other $refs that point to this $ref
      return a.circular ? -1 : +1;
    } else if (a.extended !== b.extended) {
      // If the $ref extends the resolved value, then sort it lower than other $refs that don't extend the value
      return a.extended ? +1 : -1;
    } else if (a.indirections !== b.indirections) {
      // Sort direct references higher than indirect references
      return a.indirections - b.indirections;
    } else if (a.depth !== b.depth) {
      // Sort $refs by how close they are to the JSON Schema root
      return a.depth - b.depth;
    } else {
      // Determine how far each $ref is from the "definitions" property.
      // Most people will expect references to be bundled into the the "definitions" property if possible.
      const aDefinitionsIndex = Math.max(
        a.pathFromRoot.lastIndexOf('/definitions'),
        a.pathFromRoot.lastIndexOf('/$defs'),
      );
      const bDefinitionsIndex = Math.max(
        b.pathFromRoot.lastIndexOf('/definitions'),
        b.pathFromRoot.lastIndexOf('/$defs'),
      );

      if (aDefinitionsIndex !== bDefinitionsIndex) {
        // Give higher priority to the $ref that's closer to the "definitions" property
        return bDefinitionsIndex - aDefinitionsIndex;
      } else {
        // All else is equal, so use the shorter path, which will produce the shortest possible reference
        return a.pathFromRoot.length - b.pathFromRoot.length;
      }
    }
  });

  let file, hash, pathFromRoot;
  for (const entry of inventory) {
    // console.log('Re-mapping $ref pointer "%s" at %s', entry.$ref.$ref, entry.pathFromRoot);

    const bundleOpts = (options.bundle || {}) as BundleOptions;
    if (!entry.external) {
      // This $ref already resolves to the main JSON Schema file.
      // When optimizeInternalRefs is false, preserve the original internal ref path
      // instead of rewriting it to the fully resolved hash. References to nested
      // resources must also retain their resource URI so that "#" does not point
      // at the document root instead.
      if (bundleOpts.optimizeInternalRefs !== false && !entry.nestedResource) {
        entry.$ref.$ref = entry.hash;
      }
    } else if (entry.file === file && entry.hash === hash) {
      // This $ref points to the same value as the previous $ref, so remap it to the same path
      if (rootId && isInsideIdScope(inventory, entry)) {
        // This entry is inside a sub-schema with its own $id, so a bare root-relative JSON Pointer
        // would be resolved relative to that $id, not the document root. Qualify with the root $id.
        entry.$ref.$ref = rootId + pathFromRoot;
      } else {
        entry.$ref.$ref = pathFromRoot;
      }
    } else if (entry.file === file && entry.hash.indexOf(hash + '/') === 0) {
      // This $ref points to a sub-value of the previous $ref, so remap it beneath that path
      const subPath = Pointer.join(pathFromRoot, Pointer.parse(entry.hash.replace(hash, '#')));
      if (rootId && isInsideIdScope(inventory, entry)) {
        entry.$ref.$ref = rootId + subPath;
      } else {
        entry.$ref.$ref = subPath;
      }
    } else {
      // We've moved to a new file or new hash
      file = entry.file;
      hash = entry.hash;
      pathFromRoot = entry.pathFromRoot;

      // This is the first $ref to point to this value, so dereference the value.
      // Any other $refs that point to the same value will point to this $ref instead
      entry.$ref = entry.parent[entry.key] = $Ref.dereference(entry.$ref, entry.value, options);

      if (entry.circular) {
        // This $ref points to itself
        entry.$ref.$ref = entry.pathFromRoot;
      }
    }
  }

  // we want to ensure that any $refs that point to another $ref are remapped to point to the final value
  // let hadChange = true;
  // while (hadChange) {
  //   hadChange = false;
  //   for (const entry of inventory) {
  //     if (entry.$ref && typeof entry.$ref === "object" && "$ref" in entry.$ref) {
  //       const resolved = inventory.find((e: InventoryEntry) => e.pathFromRoot === entry.$ref.$ref);
  //       if (resolved) {
  //         const resolvedPointsToAnotherRef =
  //           resolved.$ref && typeof resolved.$ref === "object" && "$ref" in resolved.$ref;
  //         if (resolvedPointsToAnotherRef && entry.$ref.$ref !== resolved.$ref.$ref) {
  //           // console.log('Re-mapping $ref pointer "%s" at %s', entry.$ref.$ref, entry.pathFromRoot);
  //           entry.$ref.$ref = resolved.$ref.$ref;
  //           hadChange = true;
  //         }
  //       }
  //     }
  //   }
  // }
}

/**
 * TODO
 */
function findInInventory(inventory: InventoryEntry[], $refParent: any, $refKey: any) {
  for (const existingEntry of inventory) {
    if (existingEntry && existingEntry.parent === $refParent && existingEntry.key === $refKey) {
      return existingEntry;
    }
  }
  return undefined;
}

function removeFromInventory(inventory: InventoryEntry[], entry: any) {
  const index = inventory.indexOf(entry);
  inventory.splice(index, 1);
}

/**
 * After remapping, some $ref paths may traverse through other $ref nodes.
 * JSON pointer resolution does not follow $ref indirection, so these paths are invalid.
 * This function detects and fixes such paths by following any intermediate $refs
 * to compute a valid direct path.
 */
function fixRefsThroughRefs(inventory: InventoryEntry[], schema: any) {
  for (const entry of inventory) {
    if (!entry.$ref || typeof entry.$ref !== 'object' || !('$ref' in entry.$ref)) {
      continue;
    }

    const refValue = entry.$ref.$ref;
    if (typeof refValue !== 'string' || !refValue.startsWith('#/')) {
      continue;
    }

    const fixedPath = resolvePathThroughRefs(schema, refValue);
    if (fixedPath !== refValue) {
      entry.$ref.$ref = fixedPath;
    }
  }
}

/**
 * Walks a JSON pointer path through the schema. If any intermediate value
 * is a $ref, follows it and adjusts the path accordingly.
 * Returns the corrected path that doesn't traverse through any $ref.
 */
function resolvePathThroughRefs(schema: any, refPath: string): string {
  if (!refPath.startsWith('#/')) {
    return refPath;
  }

  const segments = refPath.slice(2).split('/');
  let current = schema;
  const resolvedSegments: string[] = [];

  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      // Can't walk further, return original path
      return refPath;
    }

    // If the current value is a $ref, follow it
    if ('$ref' in current && typeof current.$ref === 'string' && current.$ref.startsWith('#/')) {
      // Follow the $ref and restart the path from its target
      const targetSegments = current.$ref.slice(2).split('/');
      resolvedSegments.length = 0;
      resolvedSegments.push(...targetSegments);
      current = walkPath(schema, current.$ref);
      if (current === null || current === undefined || typeof current !== 'object') {
        return refPath;
      }
    }

    const decoded = seg.replace(/~1/g, '/').replace(/~0/g, '~');
    const idx = Array.isArray(current) ? parseInt(decoded) : decoded;
    current = current[idx];
    resolvedSegments.push(seg);
  }

  const result = '#/' + resolvedSegments.join('/');
  return result;
}

/**
 * Walks a JSON pointer path through a schema object, returning the value at that path.
 */
function walkPath(schema: any, path: string): any {
  if (!path.startsWith('#/')) {
    return undefined;
  }

  const segments = path.slice(2).split('/');
  let current = schema;

  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    const decoded = seg.replace(/~1/g, '/').replace(/~0/g, '~');
    const idx = Array.isArray(current) ? parseInt(decoded) : decoded;
    current = current[idx];
  }

  return current;
}

/**
 * Checks whether the given inventory entry is located inside a sub-schema that has its own $id.
 * If so, root-relative JSON Pointer $refs placed at this location would be resolved against
 * the $id base URI rather than the document root, making them invalid.
 */
function isInsideIdScope(inventory: InventoryEntry[], entry: InventoryEntry): boolean {
  for (const other of inventory) {
    // Skip root-level entries
    if (other.pathFromRoot === '#' || other.pathFromRoot === '#/') {
      continue;
    }
    // Check if the other entry is an ancestor of the current entry
    if (entry.pathFromRoot.startsWith(other.pathFromRoot + '/')) {
      // Check if the ancestor's resolved value has a $id
      if (other.value && typeof other.value === 'object' && '$id' in other.value) {
        return true;
      }
    }
  }
  return false;
}
