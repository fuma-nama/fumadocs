import { defineConfig } from 'waku/config';
import mdx from 'fumadocs-mdx/vite';
import * as MdxConfig from './source.config.js';
import { UserConfig } from 'vite';

export default defineConfig({
  unstable_viteConfigs: {
    common() {
      return {
        plugins: [mdx(MdxConfig)],
      } as UserConfig;
    },
  },
});
