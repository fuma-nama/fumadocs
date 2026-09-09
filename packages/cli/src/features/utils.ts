import fs from 'node:fs/promises';
import path from 'node:path';
import type { Project, ReactFramework } from '@/project';
import type { FormattedRoute } from '@/project/route';
import type { FeatureContext, PackageJson } from '@/features';
import { addReactRouterRoute } from '@/codemod';

/** the shallowest `.ts`/`.tsx` file under `dir` whose content includes `needle`, relative to `cwd` */
export async function findSource(
  cwd: string,
  dir: string,
  needle: string,
  match: (file: string) => boolean = () => true,
) {
  const entries = await fs
    .readdir(path.join(cwd, dir), { recursive: true, withFileTypes: true })
    .catch(() => []);
  const depth = (dir: string) => dir.split(path.sep).length;
  entries.sort((a, b) => depth(a.parentPath) - depth(b.parentPath));

  for (const entry of entries) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name) || entry.parentPath.includes('node_modules'))
      continue;
    const file = path.join(entry.parentPath, entry.name);
    if (!match(file)) continue;
    if ((await fs.readFile(file, 'utf-8')).includes(needle)) return path.relative(cwd, file);
  }
}

export function scripts(json: PackageJson, scripts: Record<string, string>) {
  Object.assign((json.scripts ??= {}), scripts);
}

export const reactOnly = (project: Project) =>
  project.framework !== 'astro' || 'Astro is not supported by this feature';

export function reactFramework(project: Project): ReactFramework {
  if (project.framework === 'astro') throw new Error('Astro is not supported by this feature');
  return project.framework;
}

/** POSIX path for generated code and route configs */
export const posix = (file: string) => file.split(path.sep).join('/');

/** add an export to a source file, unless a declaration with the same name exists */
export async function addExport(ctx: FeatureContext, file: string, name: string, code: string) {
  const current = await fs.readFile(path.join(ctx.project.cwd, file), 'utf-8').catch(() => '');
  if (new RegExp(`export (async )?(const|function) ${name}\\b`).test(current)) return false;
  await ctx.append(file, [code]);
  return true;
}

/** the value of a route constant in `lib/shared.ts`, defined with `value` when missing */
export async function sharedRoute(ctx: FeatureContext, name: string, value: string) {
  const file = path.join(ctx.project.baseDir, 'lib/shared.ts');
  const current = await fs.readFile(path.join(ctx.project.cwd, file), 'utf-8').catch(() => '');
  const existing = new RegExp(`export const ${name}\\s*=\\s*['"]([^'"]*)['"]`).exec(current)?.[1];
  if (existing !== undefined) return existing;
  await ctx.append(file, [`export const ${name} = '${value}';`]);
  return value;
}

/** import of the generated types of a React Router route module */
export const reactRouterTypes = (route: FormattedRoute) =>
  `import type { Route } from './+types/${path.posix.basename(route.file).replace(/\.tsx?$/, '')}';`;

/** add routes to `routes.ts`, or tell the user when the config isn't an array (e.g. file-based routes) */
export async function registerReactRouterRoutes(
  ctx: FeatureContext,
  routes: (FormattedRoute | string)[],
): Promise<boolean> {
  const { baseDir } = ctx.project;
  const entries = routes.map((item) =>
    typeof item === 'string' ? item : { path: item.path, entry: item.file },
  );
  let added = false;
  const edited = await ctx.source(path.join(baseDir, 'routes.ts'), (file) => {
    const first = entries[0];
    if (file.code.includes(typeof first === 'string' ? first : first.entry)) {
      added = true;
      return;
    }
    added = addReactRouterRoute(file, entries);
  });

  if (!edited || !added) {
    const list = entries.map((item) =>
      typeof item === 'string' ? item : `route('${item.path}', '${item.entry}')`,
    );
    ctx.note(`Register the routes in your route config:\n  ${list.join('\n  ')}`);
  }
  return added;
}

/** features reading page Markdown need Fumadocs MDX collections, or a runtime source exposing `page.data.content` */
export const requiresMarkdown = (project: Project) =>
  project.framework === 'astro'
    ? 'Astro is not supported by this feature'
    : project.source.collections !== null ||
      project.source.dynamic ||
      'requires Fumadocs MDX or a runtime content source';

/** how generated code refers to the loader of `lib/source.ts` */
export interface SourceRef {
  /** resolved on demand, `lib/source.ts` exports `getSource()` instead of `source` */
  dynamic: boolean;
  /** passed to Fumadocs APIs, which accept a loader or a function resolving one */
  ref: string;
  /** reads the loader inside an async function */
  resolved: string;
}

export function sourceRef(dynamic: boolean): SourceRef {
  return dynamic
    ? { dynamic: true, ref: 'getSource', resolved: '(await getSource())' }
    : { dynamic: false, ref: 'source', resolved: 'source' };
}
