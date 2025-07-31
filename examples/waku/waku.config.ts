import { defineConfig } from 'waku/config';
import mdx from 'fumadocs-mdx/vite';
import * as MdxConfig from './source.config.js';

export default defineConfig({
  unstable_viteConfigs: {
    //@ts-expect-error
    common() {
      return {
        plugins: [mdx(MdxConfig)],
      };
    },
  },
});
