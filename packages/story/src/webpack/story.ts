import path from 'node:path';
import type { LoaderDefinitionFunction } from 'webpack';
import { createControlsProject } from '@/utils/generate';
import { transformStoryFile } from '@/utils/transform';
import type { Project } from 'ts-morph';

export interface StoryLoaderOptions {
  /**
   * Path to `tsconfig.json`.
   *
   * @default "tsconfig.json"
   */
  tsconfigPath?: string;
}

let projectPromise: Promise<Project> | undefined;

const loader: LoaderDefinitionFunction<StoryLoaderOptions> = function (source) {
  const callback = this.async();
  const options = this.getOptions();
  this.cacheable(true);

  const run = async () => {
    if (!projectPromise) {
      const resolvedTsconfig = options.tsconfigPath ?? path.join(this.rootContext, 'tsconfig.json');
      projectPromise = createControlsProject(resolvedTsconfig);
    }

    try {
      const transformed = transformStoryFile(
        '@fumadocs/story/next/client',
        source,
        this.resourcePath,
        await projectPromise!,
      );
      callback(undefined, transformed ?? source);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      callback(error);
    }
  };

  void run();
};

export default loader;
