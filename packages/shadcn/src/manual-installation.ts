import type { ShadcnRegistryOptions } from '.';
import type { BuiltRegistryFile, BuiltRegistryItem } from './types';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  formatAddCommand,
  formatInstallCommand,
  getRegistryItemPath,
  PM,
  resolveRegistryDependency,
} from './utils';

export type ManualInstallationSnippet =
  | {
      lang: string;
      code: string;
      path: string;
      title: string;
      kind: 'file';
    }
  | {
      kind: 'docs';
      content: string;
    }
  | {
      kind:
        // Add CSS variables to your global stylesheet
        | 'cssVars'
        // Add CSS rules to your global stylesheet
        | 'css'
        // Update your Tailwind configuration
        | 'tailwind'
        // Add environment variables
        | 'envVars';
      lang: string;
      code: string;
    }
  | {
      kind: 'dependencies' | 'devDependencies' | 'registryDependencies';
      lang: string;
      codeTabs: Record<PM, string>;
      dependencies: string[];
    };

export interface GetManualInstallationOptions {
  /**
   * Registry item name to generate snippets for.
   */
  name: string;

  /**
   * Include snippets from `registryDependencies` that exist in the same registry.
   *
   * @defaultValue `true`
   */
  includeRegistryDependencies?: boolean;
}

export async function getManualInstallation(
  registryOptions: ShadcnRegistryOptions,
  options: GetManualInstallationOptions,
): Promise<ManualInstallationSnippet[]> {
  const { name, includeRegistryDependencies = true } = options;
  const items = await collectItems(registryOptions, name, includeRegistryDependencies);
  if (items.length === 0) return [];

  const snippets: ManualInstallationSnippet[] = [];
  const dependencies = new Set<string>();
  const devDependencies = new Set<string>();
  const registryDependencies = new Set<string>();

  for (const item of items) {
    if (item.dependencies) for (const dep of item.dependencies) dependencies.add(dep);
    if (item.devDependencies) for (const dep of item.devDependencies) devDependencies.add(dep);

    if (!includeRegistryDependencies && item.registryDependencies) {
      for (const dep of item.registryDependencies) registryDependencies.add(dep);
    }

    if (item.docs) {
      snippets.push({
        kind: 'docs',
        content: item.docs,
      });
    }

    if (item.envVars && Object.keys(item.envVars).length > 0) {
      snippets.push({
        kind: 'envVars',
        lang: 'dotenv',
        code: formatEnvVars(item.envVars),
      });
    }

    if (item.cssVars && hasCssVars(item.cssVars)) {
      snippets.push({
        kind: 'cssVars',
        lang: 'css',
        code: formatCssVars(item.cssVars),
      });
    }

    if (item.css && Object.keys(item.css).length > 0) {
      snippets.push({
        kind: 'css',
        lang: 'css',
        code: formatCssRules(item.css),
      });
    }

    if (item.tailwind?.config && Object.keys(item.tailwind.config).length > 0) {
      snippets.push({
        kind: 'tailwind',
        lang: 'ts',
        code: `export default ${JSON.stringify(item.tailwind.config, null, 2)}`,
      });
    }

    for (const file of item.files ?? []) {
      if (!file.content) continue;

      const displayPath = getDisplayPath(file);
      snippets.push({
        kind: 'file',
        title: path.basename(file.path),
        lang: getLanguage(file.path),
        code: file.content,
        path: displayPath,
      });
    }
  }

  const installSnippets = createInstallSnippets({
    dependencies: Array.from(dependencies),
    devDependencies: Array.from(devDependencies),
    registryDependencies: Array.from(registryDependencies),
  });

  return [...installSnippets, ...snippets];
}

async function collectItems(
  registryOptions: ShadcnRegistryOptions,
  name: string,
  includeRegistryDependencies: boolean,
): Promise<BuiltRegistryItem[]> {
  const all = new Map<string, BuiltRegistryItem | null>();
  const queue: string[] = [getRegistryItemPath(registryOptions, name)];

  for (const item of queue) {
    const content = await fs.readFile(item, 'utf-8').catch(() => null);
    if (!content) {
      all.set(item, null);
      continue;
    }

    const parsed = JSON.parse(content) as BuiltRegistryItem;
    all.set(item, parsed);

    if (!includeRegistryDependencies || !parsed.registryDependencies) continue;

    for (const dep of parsed.registryDependencies) {
      const { local } = resolveRegistryDependency(dep);
      if (!local) continue;

      const depPath = getRegistryItemPath(registryOptions, dep);
      if (!all.has(depPath)) queue.push(depPath);
    }
  }

  const out: BuiltRegistryItem[] = [];
  for (const v of all.values()) {
    if (v) out.push(v);
  }
  return out;
}

function createInstallSnippets({
  dependencies,
  devDependencies,
  registryDependencies,
}: {
  dependencies: string[];
  devDependencies: string[];
  registryDependencies: string[];
}): ManualInstallationSnippet[] {
  const snippets: ManualInstallationSnippet[] = [];

  if (dependencies.length > 0) {
    snippets.push({
      kind: 'dependencies',
      lang: 'bash',
      codeTabs: formatInstallCommand(dependencies),
      dependencies,
    });
  }

  if (devDependencies.length > 0) {
    snippets.push({
      kind: 'devDependencies',
      lang: 'bash',
      codeTabs: formatInstallCommand(devDependencies, true),
      dependencies: devDependencies,
    });
  }

  if (registryDependencies.length > 0) {
    snippets.push({
      kind: 'registryDependencies',
      lang: 'bash',
      codeTabs: formatAddCommand(registryDependencies),
      dependencies: registryDependencies,
    });
  }

  return snippets;
}

function getDisplayPath(file: BuiltRegistryFile): string {
  if (file.target) {
    return file.target.startsWith('~/') ? file.target.slice(2) : file.target;
  }
  switch (file.type) {
    case 'registry:ui':
      return `components/ui/${path.basename(file.path)}`;
    case 'registry:component':
      return `components/${path.basename(file.path)}`;
    case 'registry:hook':
      return `lib/hooks/${path.basename(file.path)}`;
    case 'registry:lib':
      return `lib/${path.basename(file.path)}`;
    case 'registry:block':
      return `components/${path.basename(file.path)}`;
    default:
      return file.path;
  }
}

/** get Shiki supported language/grammar */
function getLanguage(filePath: string): string {
  const base = path.basename(filePath);
  if (base.startsWith('.env')) return 'dotenv';

  return path.extname(filePath).slice(1);
}

function hasCssVars(cssVars: NonNullable<BuiltRegistryItem['cssVars']>): boolean {
  return Boolean(
    (cssVars.theme && Object.keys(cssVars.theme).length > 0) ||
    (cssVars.light && Object.keys(cssVars.light).length > 0) ||
    (cssVars.dark && Object.keys(cssVars.dark).length > 0),
  );
}

function formatCssVars(cssVars: NonNullable<BuiltRegistryItem['cssVars']>): string {
  const lines = ['@layer base {'];

  const rootVars = { ...cssVars.theme, ...cssVars.light };
  if (Object.keys(rootVars).length > 0) {
    lines.push('  :root {');
    for (const [key, value] of Object.entries(rootVars)) {
      lines.push(`    --${key}: ${value};`);
    }
    lines.push('  }');
  }

  if (cssVars.dark && Object.keys(cssVars.dark).length > 0) {
    lines.push('  .dark {');
    for (const [key, value] of Object.entries(cssVars.dark)) {
      lines.push(`    --${key}: ${value};`);
    }
    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}

function formatCssRules(css: Record<string, unknown>, indent = 0): string {
  const pad = '  '.repeat(indent);
  const lines: string[] = [];

  for (const [selector, value] of Object.entries(css)) {
    if (typeof value === 'string') {
      lines.push(`${pad}${selector}: ${value};`);
      continue;
    }

    if (Array.isArray(value)) {
      lines.push(`${pad}${selector} ${value.join(' ')};`);
      continue;
    }

    if (value && typeof value === 'object') {
      if (selector.startsWith('@')) {
        lines.push(`${pad}${selector} {`);
        lines.push(formatCssRules(value as Record<string, unknown>, indent + 1));
        lines.push(`${pad}}`);
      } else {
        lines.push(`${pad}${selector} {`);
        lines.push(formatCssRules(value as Record<string, unknown>, indent + 1));
        lines.push(`${pad}}`);
      }
    }
  }

  return lines.join('\n');
}

function formatEnvVars(envVars: Record<string, string>): string {
  return Object.entries(envVars)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join('\n');
}
