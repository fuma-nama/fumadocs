/**
 * inspired by https://github.com/Redocly/openapi-sampler (MIT)
 */
import { deepmerge } from '@fastify/deepmerge';
import { isPlainObject } from '../is-plain-object';
import { resolveRefSync } from './resolve-ref';

const mergeDeep = deepmerge({
  all: true,
  isMergeableObject(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      !(value instanceof RegExp) &&
      !(value instanceof Date)
    );
  },
});

export interface JsonSchemaSampleOptions {
  readonly skipNonRequired?: boolean;
  readonly skipReadOnly?: boolean;
  readonly skipWriteOnly?: boolean;
  readonly quiet?: boolean;
  readonly enablePatterns?: boolean;
  readonly maxSampleDepth?: number;
}

type SchemaDoc = Record<string, unknown>;

const SKIP = Symbol('skip');

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

function inferType(schema: SchemaDoc): string | null {
  if (schema.type !== undefined) {
    const t = schema.type;
    return Array.isArray(t) ? (t.length === 0 ? null : String(t[0])) : String(t);
  }

  const keywordTypes: Record<string, string> = {
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
  };

  for (const [kw, ty] of Object.entries(keywordTypes)) {
    if (schema[kw] !== undefined) return ty;
  }
  return null;
}

function getCircularPlaceholder(type: string | null): unknown {
  if (type === 'object') return {};
  if (type === 'array') return [];
  return undefined;
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

function sampleNumber(schema: SchemaDoc): number {
  let res = 0;
  if (schema.type === 'number' && (schema.format === 'float' || schema.format === 'double')) {
    res = 0.1;
  }

  const exMinB = typeof schema.exclusiveMinimum === 'boolean';
  const exMaxB = typeof schema.exclusiveMaximum === 'boolean';

  if (exMinB || exMaxB) {
    if (schema.maximum != null && schema.minimum != null) {
      const min = schema.minimum as number;
      const max = schema.maximum as number;
      res = schema.exclusiveMinimum ? Math.floor(min) + 1 : min;
      if ((schema.exclusiveMaximum && res >= max) || (!schema.exclusiveMaximum && res > max)) {
        res = (max + min) / 2;
      }
      return res;
    }
    if (schema.minimum != null) {
      const min = schema.minimum as number;
      return schema.exclusiveMinimum ? Math.floor(min) + 1 : min;
    }
    if (schema.maximum != null) {
      const max = schema.maximum as number;
      if (schema.exclusiveMaximum) {
        return max > 0 ? 0 : Math.floor(max) - 1;
      }
      return max > 0 ? 0 : max;
    }
  } else {
    if (schema.minimum != null) return schema.minimum as number;
    if (schema.exclusiveMinimum != null) {
      res = Math.floor(schema.exclusiveMinimum as number) + 1;
      if (res === schema.exclusiveMaximum) {
        res = (res + Math.floor(schema.exclusiveMaximum as number) - 1) / 2;
      }
    } else if (schema.exclusiveMaximum != null) {
      res = Math.floor(schema.exclusiveMaximum as number) - 1;
    } else if (schema.maximum != null) {
      res = schema.maximum as number;
    }
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
  schema: SchemaDoc,
  options: ResolvedOptions,
  _spec: unknown,
  context: TraverseContext | undefined,
): string {
  const format = (schema.format as string | undefined) || 'default';
  const propertyName = context?.propertyName;
  const min = (schema.minLength as number | undefined) ?? 0;
  const max = schema.maxLength as number | undefined;
  const pattern = schema.pattern as string | undefined;

  const fixed = new Date('2019-08-24T14:15:22.123Z');

  const formats: Record<string, () => string> = {
    email: () => 'user@example.com',
    'idn-email': () => 'пошта@укр.нет',
    password: () => {
      let res = 'pa$$word';
      if (min > res.length) {
        res += '_';
        res += ensureMinLength('qwerty!@#$%^123456', min - res.length).substring(
          0,
          min - res.length,
        );
      }
      return res;
    },
    'date-time': () => toRFCDateTime(fixed, false, false, false),
    date: () => toRFCDateTime(fixed, true, false, false),
    time: () => toRFCDateTime(fixed, false, true, false).slice(1),
    ipv4: () => '192.168.0.1',
    ipv6: () => '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    hostname: () => 'example.com',
    'idn-hostname': () => 'приклад.укр',
    uri: () => 'http://example.com',
    'uri-reference': () => '../dictionary',
    'uri-template': () => 'http://example.com/{endpoint}',
    iri: () => 'http://example.com/entity/1',
    'iri-reference': () => '/entity/1',
    uuid: () => uuidFromSeed(propertyName || 'id'),
    'json-pointer': () => '/json/pointer',
    'relative-json-pointer': () => '1/relative/json/pointer',
    regex: () => '/regex/',
    default: () => defaultStringSample(min, max, pattern, options.enablePatterns),
  };

  const fn = formats[format] ?? formats.default;
  return fn();
}

function sampleArray(
  schema: SchemaDoc,
  options: ResolvedOptions,
  spec: unknown,
  context: TraverseContext | undefined,
): unknown[] {
  const depth = context?.depth ?? 1;
  let arrayLength = Math.min(
    schema.maxItems != null ? (schema.maxItems as number) : Number.POSITIVE_INFINITY,
    (schema.minItems as number | undefined) ?? 1,
  );

  const items = schema.prefixItems ?? schema.items ?? schema.contains;
  if (Array.isArray(items)) {
    arrayLength = Math.max(arrayLength, items.length);
  }

  const itemSchemaGetter = (i: number): SchemaDoc => {
    if (Array.isArray(items)) {
      return (items[i] as SchemaDoc) ?? {};
    }
    return (items as SchemaDoc) ?? {};
  };

  const res: unknown[] = [];
  if (!items) return res;

  for (let i = 0; i < arrayLength; i++) {
    const itemSchema = itemSchemaGetter(i);
    const { value } = traverse(itemSchema, options, spec, {
      depth: depth + 1,
      propertyName: context?.propertyName,
    });
    res.push(value);
  }
  return res;
}

function sampleObject(
  schema: SchemaDoc,
  options: ResolvedOptions,
  spec: unknown,
  context: TraverseContext | undefined,
): Record<string, unknown> {
  let res: Record<string, unknown> = {};
  const depth = context?.depth ?? 1;

  if (schema.properties && typeof schema.properties === 'object') {
    const required = Array.isArray(schema.required) ? schema.required : [];
    const requiredSet = new Set(required);

    for (const propertyName of Object.keys(schema.properties as object)) {
      if (options.skipNonRequired && !requiredSet.has(propertyName)) continue;

      const propSchema = (schema.properties as Record<string, SchemaDoc>)[propertyName]!;
      const sample = traverse(propSchema, options, spec, {
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

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    const ap = schema.additionalProperties as SchemaDoc;
    const baseName = (ap['x-additionalPropertiesName'] as string | undefined) || 'property';
    res[`${String(baseName)}1`] = traverse(ap, options, spec, {
      depth: depth + 1,
    }).value;
    res[`${String(baseName)}2`] = traverse(ap, options, spec, {
      depth: depth + 1,
    }).value;
  }

  if (
    schema.properties &&
    typeof schema.properties === 'object' &&
    typeof schema.maxProperties === 'number' &&
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
      if (added < (schema.maxProperties as number) && !(name in filtered)) {
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
  type: string | null;
}

interface TraverseContext {
  propertyName?: string;
  /** Defaults to 1 when omitted */
  depth?: number;
  isAllOfChild?: boolean;
}

type ResolvedOptions = typeof defaultOptions & JsonSchemaSampleOptions;

function inferExample(schema: SchemaDoc): unknown | undefined {
  if (schema.const !== undefined) return schema.const;
  if (Array.isArray(schema.examples) && schema.examples.length > 0) {
    return schema.examples[0];
  }
  if (Array.isArray(schema.enum) && schema.enum!.length > 0) {
    return schema.enum![0];
  }
  if (schema.default !== undefined) return schema.default;
  return undefined;
}

function tryInferExample(schema: SchemaDoc): TraverseResult | undefined {
  const example = inferExample(schema);
  if (example !== undefined) {
    return {
      value: example,
      readOnly: schema.readOnly as boolean | undefined,
      writeOnly: schema.writeOnly as boolean | undefined,
      type: null,
    };
  }
  return undefined;
}

function allOfSample(
  into: SchemaDoc,
  children: SchemaDoc[],
  options: ResolvedOptions,
  spec: unknown,
  context: TraverseContext | undefined,
): TraverseResult {
  const res = traverse(into, options, spec);
  const subSamples: unknown[] = [];

  for (const subSchema of children) {
    const { type, readOnly, writeOnly, value } = traverse(
      { type: res.type, ...subSchema },
      options,
      spec,
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
      (res.value as Record<string, unknown>) || {},
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
  (
    schema: SchemaDoc,
    options: ResolvedOptions,
    spec: unknown,
    context: TraverseContext | undefined,
  ) => unknown
> = {
  array: sampleArray,
  boolean: sampleBoolean,
  integer: sampleNumber,
  number: sampleNumber,
  object: sampleObject,
  string: sampleString,
};

function traverseOneOrAnyOf(
  parent: SchemaDoc,
  selectedSubSchema: SchemaDoc,
  options: ResolvedOptions,
  spec: unknown,
  context: TraverseContext | undefined,
): TraverseResult {
  const inferred = tryInferExample(parent);
  if (inferred !== undefined) return inferred;

  const localExample = traverse(
    { ...parent, oneOf: undefined, anyOf: undefined },
    options,
    spec,
    context,
  );
  const subExample = traverse(selectedSubSchema, options, spec, context);

  if (
    typeof localExample.value === 'object' &&
    localExample.value !== null &&
    typeof subExample.value === 'object' &&
    subExample.value !== null
  ) {
    const mergedExample = mergeDeep(
      localExample.value as Record<string, unknown>,
      subExample.value as Record<string, unknown>,
    );
    return { ...subExample, value: mergedExample };
  }

  return subExample;
}

function traverse(
  schema: unknown,
  options: ResolvedOptions,
  spec: unknown,
  context?: TraverseContext,
): TraverseResult {
  if (context) {
    if (seenObjectStack.includes(schema as object)) {
      return { value: getCircularPlaceholder(inferType(schema as SchemaDoc)), type: null };
    }
    seenObjectStack.push(schema as object);
  }

  if (context && (context.depth ?? 1) > options.maxSampleDepth) {
    popStack(context);
    return { value: getCircularPlaceholder(inferType(schema as SchemaDoc)), type: null };
  }

  if (!isPlainObject(schema)) {
    popStack(context);
    return { value: schema, type: null };
  }

  const s = schema as SchemaDoc;

  if (typeof s.$ref === 'string') {
    if (spec == null) {
      throw new Error(
        'Your schema contains $ref. You must provide full specification in the third parameter.',
      );
    }
    const ref = decodeURIComponent(s.$ref);
    if (!ref.startsWith('#')) {
      throw new Error(
        'Your schema contains $ref. Only in-document references (`#/…`) are supported.',
      );
    }

    if (refResolving[ref]) {
      const referenced = resolveRefSync(ref, spec) as SchemaDoc | undefined;
      const referencedType = inferType(referenced ?? {});
      popStack(context);
      return { value: getCircularPlaceholder(referencedType), type: null };
    }

    refResolving[ref] = true;
    const referenced = resolveRefSync(ref, spec);
    if (referenced === undefined) {
      refResolving[ref] = false;
      popStack(context);
      throw new Error(`Could not resolve $ref: ${s.$ref}`);
    }
    const result = traverse(referenced, options, spec, context);
    refResolving[ref] = false;
    popStack(context);
    return result;
  }

  if (s.example !== undefined) {
    popStack(context);
    return {
      value: s.example,
      readOnly: s.readOnly as boolean | undefined,
      writeOnly: s.writeOnly as boolean | undefined,
      type: s.type as string | null,
    };
  }

  if (s.allOf !== undefined) {
    popStack(context);
    return (
      tryInferExample(s) ??
      allOfSample({ ...s, allOf: undefined }, s.allOf as SchemaDoc[], options, spec, context)
    );
  }

  if (s.oneOf && Array.isArray(s.oneOf) && s.oneOf.length > 0) {
    if (s.anyOf && !options.quiet) {
      console.warn('oneOf and anyOf are not supported on the same level. Skipping anyOf');
    }
    popStack(context);
    const firstOneOf = Object.assign(
      {
        readOnly: s.readOnly,
        writeOnly: s.writeOnly,
      },
      s.oneOf[0] as SchemaDoc,
    );
    return traverseOneOrAnyOf(s, firstOneOf, options, spec, context);
  }

  if (s.anyOf && Array.isArray(s.anyOf) && s.anyOf.length > 0) {
    popStack(context);
    const firstAnyOf = Object.assign(
      {
        readOnly: s.readOnly,
        writeOnly: s.writeOnly,
      },
      s.anyOf[0] as SchemaDoc,
    );
    return traverseOneOrAnyOf(s, firstAnyOf, options, spec, context);
  }

  if (s.if && s.then) {
    popStack(context);
    const { if: ifSchema, then, ...rest } = s;
    return traverse(
      mergeDeep(rest, ifSchema as SchemaDoc, then as SchemaDoc),
      options,
      spec,
      context,
    );
  }

  let example = inferExample(s);
  let type: string | null = null;

  if (example === undefined) {
    example = null;
    type = s.type as string | null;
    if (Array.isArray(type) && type.length > 0) type = type[0] as string;
    if (!type) type = inferType(s);

    const sampler = type ? typeSamplers[type] : undefined;
    if (sampler) {
      example = sampler(s, options, spec, context);
    }
  }

  popStack(context);
  return {
    value: example,
    readOnly: s.readOnly as boolean | undefined,
    writeOnly: s.writeOnly as boolean | undefined,
    type,
  };
}

export function sample(schema: object, options?: JsonSchemaSampleOptions, spec?: object): unknown {
  const opts: ResolvedOptions = {
    ...defaultOptions,
    ...options,
  };

  clearCaches();
  return traverse(schema, opts, spec).value;
}
