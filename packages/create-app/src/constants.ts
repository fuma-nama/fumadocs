import { fileURLToPath } from 'node:url';
import versionPkg from '../../create-app-versions/package.json';
import * as corePkg from '../../core/package.json';
import * as uiPkg from '../../ui/package.json';
import * as mdxPkg from '../../mdx/package.json';
import * as radixPkg from '../../radix-ui/package.json';
import * as basePkg from '../../base-ui/package.json';

export const sourceDir = fileURLToPath(new URL(`../`, import.meta.url).href);

export const isCI = Boolean(process.env.CI);

export interface TemplateInfo {
  value:
    | '+next+fuma-docs-mdx'
    | 'waku'
    | 'react-router'
    | 'react-router-spa'
    | 'tanstack-start'
    | 'tanstack-start-spa'
    | '+next+fuma-docs-mdx+static';
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
    value: '+next+fuma-docs-mdx+static',
    label: 'Next.js Static: Fumadocs MDX',
    appDir: '',
    rootProviderPath: 'components/provider.tsx',
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
  {
    value: 'tanstack-start-spa',
    label: 'Tanstack Start SPA: Fumadocs MDX (not RSC)',
    hint: 'SPA mode allows you to host the site statically, compatible with a CDN.',
    appDir: 'src',
    rootProviderPath: 'routes/__root.tsx',
  },
];

const workspaces = [corePkg, uiPkg, mdxPkg, radixPkg, basePkg];

export const depVersions = versionPkg.dependencies;

for (const workspace of workspaces) {
  depVersions[workspace.name as keyof typeof depVersions] = workspace.version;
}
