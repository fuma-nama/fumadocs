import { fileURLToPath } from 'node:url';
import { versions as localVersions } from '@/versions';
import versionPkg from '../../create-app-versions/package.json';

export const sourceDir = fileURLToPath(new URL(`../`, import.meta.url).href);
export const cwd = process.cwd();

export interface TemplateInfo {
  label: string;
  value: string;
  hint?: string;

  componentsDir: string;
}

export const templates = [
  {
    value: '+next+fuma-docs-mdx',
    label: 'Next.js: Fumadocs MDX',
    hint: 'recommended',
    componentsDir: 'components',
  },
  {
    value: 'waku',
    label: 'Waku: Fumadocs MDX',
    componentsDir: 'src/components',
  },
  {
    value: 'react-router',
    label: 'React Router: Fumadocs MDX (not RSC)',
    componentsDir: 'app/components',
  },
  {
    value: 'react-router-spa',
    label: 'React Router SPA: Fumadocs MDX (not RSC)',
    hint: 'SPA mode allows you to host the site statically, compatible with a CDN.',
    componentsDir: 'app/components',
  },
  {
    value: 'tanstack-start',
    label: 'Tanstack Start: Fumadocs MDX (not RSC)',
    componentsDir: 'src/components',
  },
] as const satisfies TemplateInfo[];

export const depVersions = {
  ...localVersions,
  ...versionPkg.dependencies,
};
