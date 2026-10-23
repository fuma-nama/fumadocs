import path from 'node:path';
import type { Plugin } from 'vite';
import { createStoryTransformer, type StoryTransformer } from '@/utils/transform';

export interface StoryPluginOptions {
  /**
   * Path to `tsconfig.json`.
   *
   * @default "tsconfig.json"
   */
  tsconfigPath?: string;

  /**
   * Filter story files to transform by id (regex)
   *
   * @default `/\.story\.(js|jsx|ts|tsx)$/`
   */
  filter?: RegExp;
}

export default function story(pluginOptions: StoryPluginOptions = {}): Plugin {
  const { filter = /\.story\.(js|jsx|ts|tsx)$/ } = pluginOptions;
  let transform: StoryTransformer;

  return {
    name: 'fumadocs:story',
    enforce: 'pre',
    configResolved(resolved) {
      transform = createStoryTransformer(
        '@fumadocs/story/vite/client',
        pluginOptions.tsconfigPath ?? path.join(resolved.root, 'tsconfig.json'),
      );
    },
    transform: {
      filter: { id: filter },
      handler(code, id) {
        return transform(code, id);
      },
    },
  };
}
