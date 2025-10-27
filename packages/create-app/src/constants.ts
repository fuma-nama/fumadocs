import { fileURLToPath } from 'node:url';
import versionPkg from '../../create-app-versions/package.json';

export const sourceDir = fileURLToPath(new URL(`../`, import.meta.url).href);

export const isCI = Boolean(process.env.CI);

export interface TemplateInfo {
  value:
    | '+next+fuma-docs-mdx'
    | 'waku'
    | 'react-router'
    | 'react-router-spa'
    | 'tanstack-start';
  label: string;
  appDir: string;
  /**
   * path to root provider, relative to `appDir``
   */
  rootProviderPath: string;
  hint?: string;
  /**
   * rename files when copying from template
   */
  rename?: (name: string) => string;
}

export const templates: TemplateInfo[] = [
  {
    value: '+next+fuma-docs-mdx',
    label: 'Next.js: Fumadocs MDX',
    hint: 'recommended',
    appDir: '',
    rootProviderPath: 'app/layout.tsx',
  },
  {
    value: 'waku',
    label: 'Waku: Fumadocs MDX',
    appDir: 'src',
    rootProviderPath: 'components/provider.tsx',
  },
  {
    value: 'react-router',
    label: 'React Router: Fumadocs MDX (not RSC)',
    appDir: 'app',
    rootProviderPath: 'root.tsx',
  },
  {
    value: 'react-router-spa',
    label: 'React Router SPA: Fumadocs MDX (not RSC)',
    hint: 'SPA mode allows you to host the site statically, compatible with a CDN.',
    appDir: 'app',
    rootProviderPath: 'root.tsx',
  },
  {
    value: 'tanstack-start',
    label: 'Tanstack Start: Fumadocs MDX (not RSC)',
    appDir: 'src',
    rootProviderPath: 'routes/__root.tsx',
  },
];

export const depVersions = versionPkg.dependencies;
