import fs from 'node:fs/promises';
import path from 'node:path';
import { exists } from '@/utils/fs';
import picocolors from 'picocolors';
import { spinner } from '@clack/prompts';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/** Path of pre-rendered EPUB, choose one according to your React framework */
const EPUB_BUILD_PATHS: Record<string, string> = {
  next: '.next/server/app/export/epub.body',
  'tanstack-start': '.output/public/export/epub',
  'tanstack-start-spa': 'dist/client/export/epub',
  'react-router': 'build/client/export/epub',
  'react-router-spa': 'build/client/export/epub',
  waku: 'dist/public/export/epub',
};

const API_ROUTE_TEMPLATE = `import { source } from '@/lib/source';
import { exportEpub } from 'fumadocs-epub';

export const revalidate = false;

export async function GET(): Promise<Response> {
  const buffer = await exportEpub({
    source,
    config: {
      title: 'Documentation',
      author: 'Your Team',
      description: 'Exported documentation',
      cover: '/cover.png',
    },
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': 'attachment; filename="docs.epub"',
    },
  });
}
`;

async function findAppDir(cwd: string): Promise<string | null> {
  const appPaths = ['app', 'src/app'];
  for (const appPath of appPaths) {
    const fullPath = path.join(cwd, appPath);
    if (await exists(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

async function scaffoldEpubRoute(cwd: string): Promise<boolean> {
  const appDir = await findAppDir(cwd);
  if (!appDir) {
    console.error(picocolors.red('Could not find app directory (app/ or src/app/)'));
    return false;
  }

  const routePath = path.join(appDir, 'export', 'epub', 'route.ts');
  if (await exists(routePath)) {
    console.log(picocolors.yellow('EPUB route already exists at'), routePath);
    return true;
  }

  await fs.mkdir(path.dirname(routePath), { recursive: true });
  await fs.writeFile(routePath, API_ROUTE_TEMPLATE);
  console.log(picocolors.green('Created EPUB route at'), routePath);
  return true;
}

export async function exportEpub(options: {
  output?: string;
  framework: string;
  scaffoldOnly?: boolean;
}) {
  const cwd = process.cwd();
  const outputPath = path.resolve(cwd, options.output ?? 'docs.epub');
  const framework = options.framework;

  const spin = spinner();

  const buildPath = EPUB_BUILD_PATHS[framework];
  if (!buildPath) {
    const valid = Object.keys(EPUB_BUILD_PATHS).join(', ');
    console.error(picocolors.red(`Invalid --framework "${framework}". Must be one of: ${valid}`));
    process.exit(1);
  }

  // Check for Next.js when scaffolding (only Next.js scaffold is implemented)
  const hasNextConfig =
    (await exists(path.join(cwd, 'next.config.js'))) ||
    (await exists(path.join(cwd, 'next.config.ts'))) ||
    (await exists(path.join(cwd, 'next.config.mjs')));
  let hasNextInPkg = false;
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
    hasNextInPkg = !!deps?.next;
  } catch {
    // no package.json or invalid
  }
  const hasAppOrPages =
    (await exists(path.join(cwd, 'app'))) ||
    (await exists(path.join(cwd, 'pages'))) ||
    (await exists(path.join(cwd, 'src', 'app'))) ||
    (await exists(path.join(cwd, 'src', 'pages')));
  const hasNext = hasNextConfig || (hasNextInPkg && hasAppOrPages);

  if (!hasNext && framework === 'next') {
    console.error(picocolors.red('Next.js project not found. Run this command from a Fumadocs Next.js project root.'));
    process.exit(1);
  }

  // Scaffold EPUB route (Next.js only for now)
  if (framework === 'next') {
    spin.start('Scaffolding EPUB route');
    const scaffolded = await scaffoldEpubRoute(cwd);
    spin.stop(scaffolded ? 'EPUB route ready' : 'Scaffolding failed');

    if (!scaffolded) {
      process.exit(1);
    }
  }

  if (options.scaffoldOnly) {
    console.log(picocolors.cyan('\nTo export:'));
    console.log('  1. Add fumadocs-epub to your dependencies: pnpm add fumadocs-epub');
    console.log('  2. Ensure includeProcessedMarkdown: true in your docs collection config');
    if (framework !== 'next') {
      console.log(`  3. Add a prerender route that outputs EPUB to ${buildPath}`);
    }
    console.log(`  ${framework === 'next' ? '3' : '4'}. Run production build: pnpm build`);
    console.log(`  ${framework === 'next' ? '4' : '5'}. Run: fumadocs export epub --framework ${framework}`);
    return;
  }

  // Check for fumadocs-epub dependency
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps['fumadocs-epub']) {
    console.log(picocolors.yellow('\nInstalling fumadocs-epub...'));
    const packageManager = process.env.npm_execpath?.includes('pnpm') ? 'pnpm' : process.env.npm_execpath?.includes('bun') ? 'bun' : 'npm';
    await execAsync(`${packageManager} add fumadocs-epub`, { cwd });
  }

  const fullBuildPath = path.join(cwd, buildPath);
  if (!(await exists(fullBuildPath))) {
    console.error(picocolors.red(`EPUB not found at ${buildPath}. Run production build first (e.g. pnpm build).`));
    process.exit(1);
  }

  spin.start('Copying EPUB');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.copyFile(fullBuildPath, outputPath);
  spin.stop(picocolors.green(`EPUB saved to ${outputPath}`));
}
