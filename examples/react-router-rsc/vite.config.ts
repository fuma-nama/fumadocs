import { unstable_reactRouterRSC as reactRouterRSC } from '@react-router/dev/vite';
import rsc from '@vitejs/plugin-rsc';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import mdx from 'fumadocs-mdx/vite';
import * as MdxConfig from './source.config';

export default defineConfig({
  plugins: [
    mdx(MdxConfig),
    tailwindcss(),
    reactRouterRSC(),
    rsc(),
    tsconfigPaths({
      root: __dirname,
    }),
  ],
});
