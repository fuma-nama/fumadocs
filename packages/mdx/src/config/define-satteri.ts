import type { SatteriPresetOptions } from '@fumadocs/satteri';
import type { BuildEnvironment } from '@/config/build';
import type { DocCollectionBase, GlobalConfig } from '@/config/define';

export type { SatteriPresetOptions };

type SatteriOptionsFactory = (
  environment: BuildEnvironment,
) => SatteriPresetOptions | Promise<SatteriPresetOptions>;

export interface DocCollectionSatteriTyped<
  Schema extends import('@standard-schema/spec').StandardSchemaV1 = import('@standard-schema/spec').StandardSchemaV1,
> extends DocCollectionBase<Schema> {
  type: 'doc';
  compiler: 'satteri';
  satteriOptions?: SatteriPresetOptions | SatteriOptionsFactory;
  mdxOptions?: never;
}

export interface SatteriGlobalConfig extends Omit<GlobalConfig, 'satteriOptions'> {
  satteriOptions?: SatteriPresetOptions | SatteriOptionsFactory;
}

export function defineSatteriConfig(config: SatteriGlobalConfig = {}): SatteriGlobalConfig {
  return config;
}

export function defineSatteriCollections<
  Schema extends import('@standard-schema/spec').StandardSchemaV1 = import('@standard-schema/spec').StandardSchemaV1,
>(options: DocCollectionSatteriTyped<Schema>): DocCollectionSatteriTyped<Schema> {
  return options;
}
