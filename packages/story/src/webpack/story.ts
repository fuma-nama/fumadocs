import path from 'node:path';
import type { LoaderDefinitionFunction } from 'webpack';
import { createStoryTransformer, type StoryTransformer } from '@/utils/transform';

export interface StoryLoaderOptions {
  /**
   * Path to `tsconfig.json`.
   *
   * @default "tsconfig.json"
   */
  tsconfigPath?: string;
}

let transform: StoryTransformer | undefined;

const loader: LoaderDefinitionFunction<StoryLoaderOptions> = function (source) {
  const callback = this.async();
  const { tsconfigPath = path.join(this.rootContext, 'tsconfig.json') } = this.getOptions();
  this.cacheable(true);

  transform ??= createStoryTransformer('@fumadocs/story/next/client', tsconfigPath);
  transform(source, this.resourcePath).then(
    (transformed) => callback(undefined, transformed ?? source),
    (error) => callback(error),
  );
};

export default loader;
