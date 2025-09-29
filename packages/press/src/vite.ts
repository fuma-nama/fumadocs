import type { PluginOption } from 'vite';
import rsc from '@vitejs/plugin-rsc';
import tailwindcss from '@tailwindcss/vite';
import { unstable_reactRouterRSC as reactRouterRSC } from '@react-router/dev/vite';
import mdx from 'fumadocs-mdx/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as MdxConfig from '../app/config/fumadocs-mdx';

const dir = path.dirname(fileURLToPath(import.meta.url));
const mdxConfigPath = path.join(dir, '../app/config/fumadocs-mdx.ts');

export function fumapress(): PluginOption[] {
  return [
    mdx(MdxConfig, { configPath: mdxConfigPath }),
    tailwindcss(),
    reactRouterRSC(),
    rsc(),
  ];
}
