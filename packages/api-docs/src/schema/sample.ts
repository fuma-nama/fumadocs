/**
 * inspired by https://github.com/Redocly/openapi-sampler (MIT)
 */
import type { ParsedSchema } from '.';
import { mergeDeep } from '../utils/deep-merge';
import { isPlainObject } from '../utils/is-plain-object';
import { getRaw } from '@scalar/json-magic/magic-proxy';

export interface JsonSchemaSampleOptions {
  readonly skipNonRequired?: boolean;
  readonly skipReadOnly?: boolean;
  readonly skipWriteOnly?: boolean;
  readonly quiet?: boolean;
  readonly enablePatterns?: boolean;
  readonly maxSampleDepth?: number;
}

const SKIP = Symbol('skip');

type TypeName = 'array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string';

const defaultOptions: Required<Pick<JsonSchemaSampleOptions, 'skipReadOnly' | 'maxSampleDepth'>> = {
  skipReadOnly: false,
  maxSampleDepth: 15,
};

let refResolving: Record<string, boolean> = {};
const seenObjectStack: object[] = [];

function clearCaches(): void {
  refResolving = {};
  seenObjectStack.length = 0;
}

function popStack(context: TraverseContext | undefined): void {
  if (context) seenObjectStack.pop();
}

function inferType(schema: ParsedSchema): TypeName | undefined {
  if (typeof schema === 'boolean') return;
  if (schema.type !== undefined) {
    const t = schema.type;
    if (Array.isArray(t)) return t[0];
    return t as TypeName;
  }

  const keywordTypes = {
    multipleOf: 'number',
    maximum: 'number',
    exclusiveMaximum: 'number',
    minimum: 'number',
    exclusiveMinimum: 'number',
    maxLength: 'string',
    minLength: 'string',
    pattern: 'string',
    items: 'array',
    maxItems: 'array',
    minItems: 'array',
    uniqueItems: 'array',
    additionalItems: 'array',
    maxProperties: 'object',
    minProperties: 'object',
    required: 'object',
    additionalProperties: 'object',
    properties: 'object',
    patternProperties: 'object',
    dependencies: 'object',
  } as const;

  for (const [kw, ty] of Object.entries(keywordTypes)) {
    if (schema[kw as keyof typeof keywordTypes] !== undefined) return ty;
  }
}

function getCircularPlaceholder(type: TypeName | undefined): unknown {
  if (type === 'object') return {};
  if (type === 'array') return [];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function jsf32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (a - ((b << 27) | (b >>> 5))) | 0;
    a = b ^ ((c << 17) | (c >>> 15));
    b = (c + d) | 0;
    c = (d + t) | 0;
    d = (a + t) | 0;
    return (d >>> 0) / 4294967296;
  };
}

function uuidFromSeed(str: string): string {
  const hash = hashCode(str);
  const random = jsf32(hash, hash, hash, hash);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function toRFCDateTime(date: Date, omitTime: boolean, omitDate: boolean, ms: boolean): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  let res = omitDate
    ? ''
    : `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  if (!omitTime) {
    res += `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
    if (ms) {
      res += `.${((date.getUTCMilliseconds() / 1000).toFixed(3) as string).slice(2, 5)}`;
    }
    res += 'Z';
  }
  return res;
}

function ensureMinLength(sample: string, min: number): string {
  if (min > sample.length) {
    return sample.repeat(Math.trunc(min / sample.length) + 1).substring(0, min);
  }
  return sample;
}

function sampleBoolean(): boolean {
  return true;
}

function sampleNumber(schema: ParsedSchema): number {
  let res = 0;
  if (typeof schema === 'boolean') return res;
  if (schema.type === 'number' && (schema.format === 'float' || schema.format === 'double')) {
    res = 0.1;
  }
  if (typeof schema.minimum === 'number') return schema.minimum;
  if (typeof schema.exclusiveMinimum === 'number') {
    res = Math.floor(schema.exclusiveMinimum) + 1;
    if (res === schema.exclusiveMaximum) {
      res = (res + Math.floor(schema.exclusiveMaximum) - 1) / 2;
    }
  } else if (typeof schema.exclusiveMaximum === 'number') {
    res = Math.floor(schema.exclusiveMaximum) - 1;
  } else if (typeof schema.maximum === 'number') {
    res = schema.maximum;
  }

  return res;
}

function defaultStringSample(
  min: number,
  max: number | undefined,
  pattern: string | undefined,
  enablePatterns: boolean | undefined,
): string {
  if (pattern && enablePatterns) {
    return patternSample(pattern);
  }
  let res = ensureMinLength('string', min);
  if (max != null && res.length > max) res = res.substring(0, max);
  return res;
}

/** Minimal pattern sampler for `enablePatterns` (subset of openapi-sampler). */
function patternSample(pattern: string): string {
  const stripped = pattern.replace(/^\^?/, '').replace(/\$?$/, '');
  const m = stripped.match(/^(.)\{(\d+)\}$/);
  if (m) return m[1]!.repeat(parseInt(m[2]!, 10));
  return stripped.length > 0 ? stripped : 'x';
}

function sampleString(
  schema: ParsedSchema,
  options: ResolvedOptions,
  context: TraverseContext | undefined,
): string {
  if (typeof schema === 'boolean') return '';
  const fixed = new Date('2019-08-24T14:15:22.123Z');

  switch (schema.format) {
    case 'email':
      return 'user@example.com';
    case 'idn-email':
      return 'пошта@укр.нет';
    case 'password': {
      let res = 'pa$$word';
      const min = schema.minLength ?? 0;
      if (min > res.length) {
        res += '_';
        res += ensureMinLength('qwerty!@#$%^123456', min - res.length).substring(
          0,
          min - res.length,
        );
      }
      return res;
    }
    case 'date-time':
      return toRFCDateTime(fixed, false, false, false);
    case 'date':
      return toRFCDateTime(fixed, true, false, false);
    case 'time':
      return toRFCDateTime(fixed, false, true, false).slice(1);
    case 'ipv4':
      return '192.168.0.1';
    case 'ipv6':
      return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    case 'hostname':
      return 'example.com';
    case 'idn-hostname':
      return 'приклад.укр';
    case 'uri':
      return 'http://example.com';
    case 'uri-reference':
      return '../dictionary';
    case 'uri-template':
      return 'http://example.com/{endpoint}';
    case 'iri':
      return 'http://example.com/entity/1';
    case 'iri-reference':
      return '/entity/1';
    case 'uuid':
      return uuidFromSeed(context?.propertyName || 'id');
    case 'json-pointer':
      return '/json/pointer';
    case 'relative-json-pointer':
      return '1/relative/json/pointer';
    case 'regex':
      return '/regex/';
    default:
      return defaultStringSample(
        schema.minLength ?? 0,
        schema.maxLength,
        schema.pattern,
        options.enablePatterns,
      );
  }
}

function sampleArray(
  schema: ParsedSchema,
  options: ResolvedOptions,
  context: TraverseContext | undefined,
): unknown[] {
  if (typeof schema === 'boolean') return [];
  const depth = context?.depth ?? 1;
  let arrayLength = Math.min(schema.maxItems ?? Number.POSITIVE_INFINITY, schema.minItems ?? 1);

  const items = (schema.prefixItems ?? schema.items ?? schema.contains) as
    | ParsedSchema
    | ParsedSchema[]
    | undefined;
  if (Array.isArray(items)) {
    arrayLength = Math.max(arrayLength, items.length);
  }

  const itemSchemaGetter = (i: number): ParsedSchema => {
    if (Array.isArray(items)) {
      return items[i] ?? {};
    } else {
      return items ?? {};
    }
  };

  const res: unknown[] = [];
  if (!items) return res;

  for (let i = 0; i < arrayLength; i++) {
    const itemSchema = itemSchemaGetter(i);
    const { value } = traverse(itemSchema, options, {
      depth: depth + 1,
      propertyName: context?.propertyName,
    });
    res.push(value);
  }
  return res;
}

function sampleObject(
  schema: ParsedSchema,
  options: ResolvedOptions,
  context: TraverseContext | undefined,
): Record<string, unknown> {
  let res: Record<string, unknown> = {};
  if (typeof schema === 'boolean') return res;
  const depth = context?.depth ?? 1;

  if (schema.properties) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    const requiredSet = new Set(required);

    for (const propertyName of Object.keys(schema.properties)) {
      if (options.skipNonRequired && !requiredSet.has(propertyName)) continue;

      const propSchema = schema.properties[propertyName];
      const sample = traverse(propSchema, options, {
        propertyName,
        depth: depth + 1,
      });

      if (options.skipReadOnly && sample.readOnly) {
        if (context?.isAllOfChild) res[propertyName] = SKIP as unknown;
        continue;
      }
      if (options.skipWriteOnly && sample.writeOnly) {
        if (context?.isAllOfChild) res[propertyName] = SKIP as unknown;
        continue;
      }

      res[propertyName] = sample.value;
    }
  }

  if (typeof schema.additionalProperties === 'object') {
    const ap = schema.additionalProperties;
    // @ts-expect-error -- custom property
    const baseName = ap['x-additionalPropertiesName'] || 'property';
    res[`${baseName}1`] = traverse(ap, options, {
      depth: depth + 1,
    }).value;
    res[`${baseName}2`] = traverse(ap, options, {
      depth: depth + 1,
    }).value;
  }

  if (
    schema.properties &&
    schema.maxProperties !== undefined &&
    Object.keys(res).length > schema.maxProperties
  ) {
    const filtered: Record<string, unknown> = {};
    let added = 0;
    const req = Array.isArray(schema.required) ? schema.required : [];
    for (const name of req) {
      if (res[name] !== undefined) {
        filtered[name] = res[name];
        added++;
      }
    }
    for (const name of Object.keys(res)) {
      if (added < schema.maxProperties && !(name in filtered)) {
        filtered[name] = res[name];
        added++;
      }
    }
    res = filtered;
  }

  return res;
}

interface TraverseResult {
  value: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;
  type?: TypeName | undefined;
}

interface TraverseContext {
  propertyName?: string;
  /** Defaults to 1 when omitted */
  depth?: number;
  isAllOfChild?: boolean;
}

type ResolvedOptions = typeof defaultOptions & JsonSchemaSampleOptions;

function inferExample(schema: Exclude<ParsedSchema, boolean>): unknown | undefined {
  // `getRaw` unwraps values of magic proxies, output values must be plain objects
  if (schema.const !== undefined) return getRaw(schema.const);
  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    return getRaw(schema.examples[0]);
  }
  if (Array.isArray(schema.enum) && schema.enum!.length > 0) {
    return getRaw(schema.enum![0]);
  }
  if (schema.default !== undefined) return getRaw(schema.default);
}

function tryInferExample(schema: ParsedSchema): TraverseResult | undefined {
  if (typeof schema === 'boolean') return;
  const example = inferExample(schema);
  if (example !== undefined) {
    return {
      value: example,
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
    };
  }
}

function allOfSample(
  into: Exclude<ParsedSchema, boolean>,
  children: readonly ParsedSchema[],
  options: ResolvedOptions,
  context: TraverseContext | undefined,
): TraverseResult {
  const res = traverse(into, options);
  const subSamples: unknown[] = [];

  for (const subSchema of children) {
    const { type, readOnly, writeOnly, value } = traverse(
      typeof subSchema === 'object' ? { type: res.type, ...subSchema } : subSchema,
      options,
      {
        ...context,
        depth: context?.depth ?? 1,
        isAllOfChild: true,
      },
    );
    if (res.type && type && type !== res.type) {
      if (!options.quiet) {
        console.warn("allOf: schemas with different types can't be merged");
      }
      res.type = type;
    }
    res.type = res.type ?? type;
    res.readOnly = res.readOnly || readOnly;
    res.writeOnly = res.writeOnly || writeOnly;
    if (value != null) subSamples.push(value);
  }

  if (res.type === 'object') {
    const merged = mergeDeep(
      (res.value || {}) as Record<string, unknown>,
      ...subSamples.filter((s) => typeof s === 'object' && s !== null),
    );
    for (const key of Object.keys(merged)) {
      if (merged[key] === SKIP) delete merged[key];
    }
    return { ...res, value: merged };
  }

  if (res.type === 'array') {
    if (!options.quiet) {
      console.warn('OpenAPI Sampler: found allOf with "array" type. Result may be incorrect');
    }
  }
  const last = subSamples[subSamples.length - 1];
  return { ...res, value: last != null ? last : res.value };
}

const typeSamplers: Record<
  string,
  (schema: ParsedSchema, options: ResolvedOptions, context: TraverseContext | undefined) => unknown
> = {
  array: sampleArray,
  boolean: sampleBoolean,
  integer: sampleNumber,
  number: sampleNumber,
  object: sampleObject,
  string: sampleString,
};

function traverseOneOrAnyOf(
  parent: Exclude<ParsedSchema, boolean>,
  selectedSubSchema: ParsedSchema,
  options: ResolvedOptions,
  context: TraverseContext | undefined,
): TraverseResult {
  const inferred = tryInferExample(parent);
  if (inferred !== undefined) return inferred;

  const localExample = traverse(
    { ...parent, oneOf: undefined, anyOf: undefined },
    options,
    context,
  );
  const subExample = traverse(selectedSubSchema, options, context);

  if (
    typeof localExample.value === 'object' &&
    localExample.value !== null &&
    typeof subExample.value === 'object' &&
    subExample.value !== null
  ) {
    const mergedExample = mergeDeep(localExample.value, subExample.value);
    return { ...subExample, value: mergedExample };
  }

  return subExample;
}

function traverse(
  schema: ParsedSchema,
  options: ResolvedOptions,
  context?: TraverseContext,
): TraverseResult {
  if (context) {
    if (seenObjectStack.includes(schema as object)) {
      return { value: getCircularPlaceholder(inferType(schema)) };
    }
    seenObjectStack.push(schema as object);
  }

  if (context && (context.depth ?? 1) > options.maxSampleDepth) {
    popStack(context);
    return { value: getCircularPlaceholder(inferType(schema)) };
  }

  if (!isPlainObject(schema)) {
    popStack(context);
    return { value: schema };
  }

  if (typeof schema.$ref === 'string') {
    const ref = decodeURIComponent(schema.$ref);
    // `$ref-value` is the resolved value of `$ref` on magic proxies of `@scalar/json-magic`
    const referenced = (schema as { '$ref-value': ParsedSchema | undefined })['$ref-value'];

    if (refResolving[ref]) {
      const referencedType = inferType(referenced ?? {});
      popStack(context);
      return { value: getCircularPlaceholder(referencedType) };
    }

    refResolving[ref] = true;
    if (referenced === undefined) {
      refResolving[ref] = false;
      popStack(context);
      throw new Error(
        `Could not resolve $ref: ${schema.$ref}, the schema must be a node of magic proxy ("@scalar/json-magic").`,
      );
    }

    // sibling keywords take precedence over the $ref target
    const { $ref: _, '$ref-value': _refValue, ...siblings } = schema as Record<string, unknown>;
    const result = traverse(
      Object.keys(siblings).length > 0 && isPlainObject(referenced)
        ? { ...referenced, ...siblings }
        : referenced,
      options,
      context,
    );
    refResolving[ref] = false;
    popStack(context);
    return result;
  }

  if (schema.allOf !== undefined) {
    popStack(context);
    return (
      tryInferExample(schema) ??
      allOfSample({ ...schema, allOf: undefined }, schema.allOf, options, context)
    );
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    if (schema.anyOf && !options.quiet) {
      console.warn('oneOf and anyOf are not supported on the same level. Skipping anyOf');
    }
    popStack(context);
    const firstOneOf = Object.assign(
      {
        readOnly: schema.readOnly,
        writeOnly: schema.writeOnly,
      },
      schema.oneOf[0],
    );
    return traverseOneOrAnyOf(schema, firstOneOf, options, context);
  }

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    popStack(context);
    const firstAnyOf = Object.assign(
      {
        readOnly: schema.readOnly,
        writeOnly: schema.writeOnly,
      },
      schema.anyOf[0],
    );
    return traverseOneOrAnyOf(schema, firstAnyOf, options, context);
  }

  if (schema.if && schema.then) {
    popStack(context);
    const { if: ifSchema, then, ...rest } = schema;
    return traverse(mergeDeep(rest, ifSchema, then), options, context);
  }

  let example = inferExample(schema);
  let type: TypeName | undefined = undefined;

  if (example === undefined) {
    example = null;
    type = inferType(schema);

    const sampler = type ? typeSamplers[type] : undefined;
    if (sampler) {
      example = sampler(schema, options, context);
    }
  }

  popStack(context);
  return {
    value: example,
    readOnly: schema.readOnly,
    writeOnly: schema.writeOnly,
    type,
  };
}

export function sample(schema: ParsedSchema, options?: JsonSchemaSampleOptions): unknown {
  const opts: ResolvedOptions = {
    ...defaultOptions,
    ...options,
  };

  clearCaches();
  return traverse(schema, opts).value;
}
