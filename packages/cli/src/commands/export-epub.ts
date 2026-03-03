import fs from 'node:fs/promises';
import path from 'node:path';
import { exists } from '@/utils/fs';
import picocolors from 'picocolors';
import { spinner } from '@clack/prompts';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const API_ROUTE_TEMPLATE = `import { source } from '@/lib/source';
import { exportEpub } from 'fumadocs-epub';

export const dynamic = 'force-dynamic';

export async function GET() {
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

async function scaffoldApiRoute(cwd: string): Promise<boolean> {
  const appDir = await findAppDir(cwd);
  if (!appDir) {
    console.error(picocolors.red('Could not find app directory (app/ or src/app/)'));
    return false;
  }

  const routePath = path.join(appDir, 'api', 'export', 'epub', 'route.ts');
  if (await exists(routePath)) {
    console.log(picocolors.yellow('API route already exists at'), routePath);
    return true;
  }

  await fs.mkdir(path.dirname(routePath), { recursive: true });
  await fs.writeFile(routePath, API_ROUTE_TEMPLATE);
  console.log(picocolors.green('Created API route at'), routePath);
  return true;
}

const PROBE_TIMEOUT_MS = 2000;

async function waitForServer(baseUrl: string, maxAttempts = 30): Promise<boolean> {
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/`;
  for (let i = 0; i < maxAttempts; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return true;
    } catch {
      clearTimeout(timeoutId);
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

export async function exportEpub(options: {
  output?: string;
  port?: number;
  scaffoldOnly?: boolean;
}) {
  const cwd = process.cwd();
  const outputPath = path.resolve(cwd, options.output ?? 'docs.epub');
  const port = options.port ?? 3000;
  const baseUrl = `http://localhost:${port}`;
  const exportUrl = `${baseUrl}/api/export/epub`;

  const spin = spinner();

  // Check for Next.js: package.json deps or app/pages directories
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
    (await exists(path.join(cwd, 'app'))) || (await exists(path.join(cwd, 'pages')));
  const hasNext = hasNextConfig || (hasNextInPkg && hasAppOrPages);
  if (!hasNext) {
    console.error(picocolors.red('Next.js project not found. Run this command from a Fumadocs Next.js project root.'));
    process.exit(1);
  }

  // Scaffold API route
  spin.start('Scaffolding API route');
  const scaffolded = await scaffoldApiRoute(cwd);
  spin.stop(scaffolded ? 'API route ready' : 'Scaffolding failed');

  if (!scaffolded) {
    process.exit(1);
  }

  if (options.scaffoldOnly) {
    console.log(picocolors.cyan('\nTo export:'));
    console.log('  1. Add fumadocs-epub to your dependencies: pnpm add fumadocs-epub');
    console.log('  2. Ensure includeProcessedMarkdown: true in your docs collection config');
    console.log('  3. Run your dev server and visit', exportUrl);
    console.log('  4. Or run: fumadocs export epub (without --scaffold-only) to build and fetch');
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

  // Build and start
  spin.start('Building Next.js app');
  try {
    await execAsync('pnpm run build || npm run build || bun run build', { cwd });
  } catch (e) {
    spin.stop('Build failed');
    console.error(e);
    process.exit(1);
  }
  spin.stop('Build complete');

  spin.start('Starting server');
  const packageManager = process.env.npm_execpath?.includes('pnpm') ? 'pnpm' : process.env.npm_execpath?.includes('bun') ? 'bun' : 'npm';
  const child = spawn(packageManager, ['run', 'start'], {
    cwd,
    env: { ...process.env, PORT: String(port) },
    shell: true,
  });

  let serverReady = false;
  child.stdout?.on('data', () => {});
  child.stderr?.on('data', () => {});

  try {
    serverReady = await waitForServer(baseUrl);
  } catch {
    // ignore
  }

  if (!serverReady) {
    spin.stop('Server failed to start');
    child.kill();
    process.exit(1);
  }

  spin.stop('Server ready');

  spin.start('Fetching EPUB');
  try {
    const headers: Record<string, string> = {};
    const epubKey = process.env.EPUB_EXPORT_KEY;
    if (epubKey) headers['x-epub-key'] = epubKey;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2 min for heavy export
    const res = await fetch(exportUrl, { headers, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`Export failed: ${res.status} ${res.statusText}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, buffer);
    spin.stop(picocolors.green(`EPUB saved to ${outputPath}`));
  } catch (e) {
    spin.stop('Export failed');
    console.error(e);
    child.kill();
    process.exit(1);
  } finally {
    child.kill();
  }
}
