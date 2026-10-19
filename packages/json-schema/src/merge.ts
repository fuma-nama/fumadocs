import { type JsonSchema } from './types';
import { deepEqual } from './utils/deep-equal';
import { dereference } from './dereference';
import { setOwn } from './utils/deep-merge';

type Schema = Exclude<JsonSchema, boolean>;

/**
 * Merge `allOf` object schema.
 *
 * Nested schemas defined by multiple schemas (e.g. a property) are combined with `allOf`, merge them when reading.
 */
export function mergeAllOf(schema: JsonSchema): JsonSchema {
  schema = dereference(schema);
  if (typeof schema === 'boolean' || !schema.allOf) return schema;
  return merge([schema], new Set(), schema.title);
}

/**
 * Merge the schemas of an instance.
 *
 * @param applied - the schemas, `allOf` and unions applied to the instance, they add nothing when met again
 * @param title - the explicit title of the instance
 */
function merge(schemas: JsonSchema[], applied: Set<unknown>, title?: string): JsonSchema {
  const list: Schema[] = [];
  const collect = (raw: JsonSchema): boolean => {
    const schema = dereference(raw);
    if (typeof schema === 'boolean') return schema;
    if (applied.has(schema)) return true;
    applied.add(schema);
    if (schema.allOf) {
      applied.add(schema.allOf);
      if (!schema.allOf.every(collect)) return false;
    }
    // after its members, the keywords of a composed schema win
    list.push(schema);
    return true;
  };
  if (!schemas.every(collect)) return false;

  const result = fold(list);
  if (result === false) return false;
  title ??= getTitle(list);

  // a union listing an applied schema is satisfied, e.g. a parent listing its subtypes in `oneOf`
  const unions: ['anyOf' | 'oneOf', readonly JsonSchema[]][] = [];
  for (const schema of list) {
    for (const field of ['anyOf', 'oneOf'] as const) {
      const union = schema[field];
      if (union && !applied.has(union) && !union.some((item) => isApplied(item, applied)))
        unions.push([field, union]);
    }
  }
  if (unions.length === 0) {
    if (title !== undefined) result.title = title;
    return result;
  }

  // distribute the unions of a field, the unions of the other field are distributed by its members
  const field = unions[0][0];
  const shared: JsonSchema[] = [result];
  let combinations: JsonSchema[][] = [[]];
  for (const [unionField, union] of unions) {
    if (unionField !== field) {
      shared.push({ [unionField]: union });
      continue;
    }
    applied.add(union);
    combinations = combinations.flatMap((items) => union.map((item) => [...items, item]));
  }

  const members: JsonSchema[] = [];
  for (const combination of combinations) {
    const member = merge([...shared, ...combination], new Set(applied));
    if (member !== false) members.push(member);
  }
  if (members.length === 0) return false;
  return title === undefined ? { [field]: members } : { title, [field]: members };
}

function isApplied(raw: JsonSchema, applied: Set<unknown>): boolean {
  const schema = dereference(raw);
  // copies of a schema share its `allOf`
  return typeof schema === 'object' && (applied.has(schema) || applied.has(schema.allOf));
}

/** fold the keywords of schemas, a nested schema defined by multiple schemas is combined with `allOf` */
function fold(list: Schema[]): Record<string, unknown> | false {
  const result: Record<string, unknown> = {};
  const required = new Set<string>();
  const nested = new Map<string, JsonSchema[]>();
  const props = new Map<string, Map<string, JsonSchema[]>>();

  for (const schema of list) {
    const record = schema as Record<string, unknown>;
    for (const key in record) {
      const value = record[key];
      if (value === undefined) continue;

      switch (key) {
        case 'title':
        case 'allOf':
        case 'anyOf':
        case 'oneOf':
          break;
        case 'minItems':
        case 'minimum':
        case 'exclusiveMinimum':
        case 'minProperties':
        case 'minContains':
        case 'minLength':
          result[key] =
            result[key] === undefined ? value : Math.max(result[key] as number, value as number);
          break;
        case 'maxContains':
        case 'maxItems':
        case 'maxLength':
        case 'maxProperties':
        case 'maximum':
        case 'exclusiveMaximum':
          result[key] =
            result[key] === undefined ? value : Math.min(result[key] as number, value as number);
          break;
        case 'enum':
          result[key] =
            result[key] === undefined
              ? value
              : intersectArray(result[key] as unknown[], value as unknown[]);
          break;
        // require same
        case 'format':
        case 'const':
          if (result[key] === undefined) result[key] = value;
          else if (!deepEqual(result[key], value)) return false;
          break;
        case 'type': {
          if (result.type === undefined) {
            result.type = value;
            break;
          }
          // `type` can be a scalar or an array (e.g. `nullable: true` becomes ['string', 'null'])
          // intersect both sets, only genuinely disjoint types are impossible
          const types = Array.isArray(value) ? value : [value];
          const shared = (Array.isArray(result.type) ? result.type : [result.type]).filter((type) =>
            types.includes(type),
          );
          if (shared.length === 0) return false;
          result.type = shared.length === 1 ? shared[0] : shared;
          break;
        }
        case 'required':
          for (const name of value as string[]) required.add(name);
          break;
        case 'properties':
        case 'patternProperties': {
          let schemas = props.get(key);
          if (!schemas) props.set(key, (schemas = new Map()));
          for (const name in value as object) {
            add(schemas, name, (value as Record<string, JsonSchema>)[name]);
          }
          break;
        }
        case 'additionalProperties':
        case 'additionalItems':
        case 'contains':
        case 'items':
        case 'not':
          add(nested, key, value as JsonSchema);
          break;
        default:
          // the later schema wins, e.g. the composed schema over its members
          result[key] = value;
      }
    }
  }

  if (required.size > 0) result.required = Array.from(required);
  for (const [key, schemas] of props) {
    const out: Record<string, JsonSchema> = {};
    for (const [name, items] of schemas) setOwn(out, name, combine(items));
    result[key] = out;
  }
  for (const [key, items] of nested) {
    // not A and not B = not (A or B)
    result[key] = key !== 'not' ? combine(items) : items.length === 1 ? items[0] : { anyOf: items };
  }
  return result;
}

function add(map: Map<string, JsonSchema[]>, key: string, schema: JsonSchema) {
  const schemas = map.get(key);
  if (schemas) schemas.push(schema);
  else map.set(key, [schema]);
}

/** combine the schemas of a nested instance location, they are merged when reading */
function combine(items: JsonSchema[]): JsonSchema {
  const out: JsonSchema[] = [];
  for (const item of items) {
    if (item === false) return false;
    if (item !== true && !out.some((other) => dereference(other) === dereference(item))) {
      out.push(item);
    }
  }
  if (out.length === 0) return true;
  return out.length === 1 ? out[0] : { allOf: out };
}

/** the titles of schemas, except those extended by another titled schema */
function getTitle(list: Schema[]): string | undefined {
  const titles = new Set<string>();
  for (const schema of list) {
    const title = schema.title;
    if (title === undefined) continue;
    const extended = list.some(
      (other) =>
        other !== schema &&
        other.title !== undefined &&
        other.allOf?.some((item) => hasTitle(item, title)),
    );
    if (!extended) titles.add(title);
  }
  if (titles.size > 0) return Array.from(titles).join(' & ');
}

/**
 * Whether the schema, or any schema it extends via `allOf`, has the given title
 */
function hasTitle(schema: JsonSchema, title: string, visited = new Set<JsonSchema>()): boolean {
  schema = dereference(schema);
  if (typeof schema === 'boolean' || visited.has(schema)) return false;
  visited.add(schema);
  if (schema.title === title) return true;
  return schema.allOf?.some((item) => hasTitle(item, title, visited)) ?? false;
}

function intersectArray<T>(a: readonly T[], b: readonly T[]): T[] {
  const out = new Set<T>();
  for (const item of a) {
    if (b.includes(item)) out.add(item);
  }
  for (const item of b) {
    if (a.includes(item)) out.add(item);
  }
  return Array.from(out);
}
