import jsonParser from './parsers/json.js';
import yamlParser from './parsers/yaml.js';
import fileResolver from './resolvers/file.js';
import { mergeDeep } from '../utils/deep-merge.js';

import type { JSONSchema, JSONSchemaObject, Plugin, ResolverOptions } from './types/index.js';

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export interface BundleOptions {
  excludedPathMatcher?(path: string): boolean;

  onBundle?(
    path: string,
    value: JSONSchemaObject,
    parent?: JSONSchemaObject,
    parentPropName?: string,
  ): void;

  optimizeInternalRefs?: boolean;
}

export interface $RefParserOptions<S extends object = JSONSchema> {
  parse: {
    json?: Plugin | boolean;
    yaml?: Plugin | boolean;
    [key: string]: Plugin | boolean | undefined;
  };

  resolve: {
    external?: boolean;
    file?: Partial<ResolverOptions<S>> | boolean;
  } & {
    [key: string]: Partial<ResolverOptions<S>> | boolean | undefined;
  };

  continueOnError: boolean;
  bundle: BundleOptions;
  mutateInputSchema?: boolean;
}

export const getJsonSchemaRefParserDefaultOptions = () => {
  return {
    parse: {
      json: { ...jsonParser },
      yaml: { ...yamlParser },
    },
    resolve: {
      file: { ...fileResolver },
      external: true,
    },
    continueOnError: false,
    bundle: {
      excludedPathMatcher: () => false,
    },
    mutateInputSchema: true,
  } as $RefParserOptions<JSONSchema>;
};

export const getNewOptions = <
  S extends object = JSONSchema,
  O extends ParserOptions<S> = ParserOptions<S>,
>(
  options: O | undefined,
): O & $RefParserOptions<S> => {
  const defaults = getJsonSchemaRefParserDefaultOptions();
  if (!options) {
    return defaults as O & $RefParserOptions<S>;
  }

  return mergeDeep(defaults, options) as O & $RefParserOptions<S>;
};

export type Options<S extends object = JSONSchema> = $RefParserOptions<S>;
export type ParserOptions<S extends object = JSONSchema> = DeepPartial<$RefParserOptions<S>>;
