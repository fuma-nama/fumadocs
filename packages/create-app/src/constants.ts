import { fileURLToPath } from 'node:url';
import { versions as localVersions } from '@/versions';
import versionPkg from '../../create-app-versions/package.json';

export const sourceDir = fileURLToPath(new URL(`../`, import.meta.url).href);
export const cwd = process.cwd();

export interface TemplateInfo {
  value:
    | '+next+fuma-docs-mdx'
    | 'waku'
    | 'react-router'
    | 'react-router-spa'
    | 'tanstack-start';
  label: string;
  hint?: string;
}

export const templates: TemplateInfo[] = [
  {
    value: '+next+fuma-docs-mdx',
    label: 'Next.js: Fumadocs MDX',
    hint: 'recommended',
  },
  {
    value: 'waku',
    label: 'Waku: Fumadocs MDX',
  },
  {
    value: 'react-router',
    label: 'React Router: Fumadocs MDX (not RSC)',
  },
  {
    value: 'react-router-spa',
    label: 'React Router SPA: Fumadocs MDX (not RSC)',
    hint: 'SPA mode allows you to host the site statically, compatible with a CDN.',
  },
  {
    value: 'tanstack-start',
    label: 'Tanstack Start: Fumadocs MDX (not RSC)',
  },
];

export const depVersions = {
  ...localVersions,
  ...versionPkg.dependencies,
};
