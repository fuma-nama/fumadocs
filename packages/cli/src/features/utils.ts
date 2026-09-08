import fs from 'node:fs/promises';
import path from 'node:path';
import type { Project, ReactFramework } from '@/project';
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
  entries.sort((a, b) => a.parentPath.length - b.parentPath.length);

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

/** join URL segments, skipping empty ones (e.g. docs at the root URL) */
export const url = (...segments: string[]) => segments.filter(Boolean).join('/');

/** the docs URL as a route segment, e.g. `docs`, empty when docs are at the root */
export const docsSegment = (ctx: FeatureContext) =>
  ctx.project.source.baseUrl.replace(/^\/+|\/+$/g, '');

/** add routes to `routes.ts`, or tell the user when the config isn't an array (e.g. file-based routes) */
export async function registerReactRouterRoutes(
  ctx: FeatureContext,
  routes: ({ path: string; entry: string } | string)[],
): Promise<boolean> {
  const { baseDir } = ctx.project;
  let added = false;
  const edited = await ctx.source(path.join(baseDir, 'routes.ts'), (file) => {
    const first = routes[0];
    if (file.code.includes(typeof first === 'string' ? first : first.entry)) {
      added = true;
      return;
    }
    added = addReactRouterRoute(file, routes);
  });

  if (!edited || !added) {
    const list = routes.map((item) =>
      typeof item === 'string' ? item : `route('${item.path}', '${item.entry}')`,
    );
    ctx.note(`Register the routes in your route config:\n  ${list.join('\n  ')}`);
  }
  return added;
}

/** features reading processed Markdown need Fumadocs MDX collections */
export const requiresMdx = (project: Project) =>
  project.framework === 'astro'
    ? 'Astro is not supported by this feature'
    : project.source.collections !== null || 'requires Fumadocs MDX, `defineDocs()` was not found';
