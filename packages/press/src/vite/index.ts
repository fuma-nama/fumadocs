import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';
import mdx from 'fumadocs-mdx/vite';
import path from 'node:path';
import * as MdxConfig from '../config/fumadocs-mdx';
import { baseDir } from '../constants';

const mdxConfigPath = path.join(baseDir, 'src/config/fumadocs-mdx.ts');

export function fumapress(): PluginOption[] {
  return [
    react(),
    rsc({
      entries: {
        client: path.join(baseDir, 'src/entry.browser.tsx'),
        rsc: path.join(baseDir, 'src/entry.rsc.tsx'),
        ssr: path.join(baseDir, 'src/entry.ssr.tsx'),
      },
    }),
    mdx(MdxConfig, { configPath: mdxConfigPath, generateIndexFile: false }),
  ];
}
