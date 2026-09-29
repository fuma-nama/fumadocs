import fs from 'node:fs/promises';
import path from 'node:path';
import { exists } from '@/utils/fs';
import picocolors from 'picocolors';
import { spinner } from '@clack/prompts';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

async function readPackageJson(cwd: string): Promise<PackageJson | null> {
  try {
    const raw = await fs.readFile(path.join(cwd, 'package.json'), 'utf-8');
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

/** Path of pre-rendered EPUB, choose one according to your React framework. Next.js fetches from the running server instead. */
const EPUB_BUILD_PATHS: Record<string, string> = {
  next: '', // Fetched from /export/epub at runtime; route handlers don't produce static files
  astro: 'dist/export/epub',
  'tanstack-start': '.output/public/export/epub',
  'tanstack-start-spa': 'dist/client/export/epub',
  'react-router': 'build/client/export/epub',
  'react-router-spa': 'build/client/export/epub',
  waku: 'dist/public/export/epub',
};

export async function exportEpub(options: { output?: string; framework: string }) {
  const cwd = process.cwd();
  const outputPath = path.resolve(cwd, options.output ?? 'docs.epub');
  const framework = options.framework;

  const spin = spinner();

  const buildPath = EPUB_BUILD_PATHS[framework];
  if (!(framework in EPUB_BUILD_PATHS)) {
    const valid = Object.keys(EPUB_BUILD_PATHS).join(', ');
    console.error(picocolors.red(`Invalid --framework "${framework}". Must be one of: ${valid}`));
    process.exit(1);
  }

  const pkg = await readPackageJson(cwd);
  // Check for fumadocs-epub dependency
  if (!pkg) {
    console.error(
      picocolors.red('Cannot read or parse package.json. Ensure it exists and is valid JSON.'),
    );
    process.exit(1);
  }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps['fumadocs-epub']) {
    console.log(picocolors.yellow('\nInstalling fumadocs-epub...'));
    const packageManager = process.env.npm_execpath?.includes('pnpm')
      ? 'pnpm'
      : process.env.npm_execpath?.includes('bun')
        ? 'bun'
        : 'npm';
    const installCmd = `${packageManager} add fumadocs-epub`;
    try {
      await execAsync(installCmd, { cwd });
    } catch (err: unknown) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err
          ? String((err as { stderr?: string }).stderr)
          : '';
      console.error(picocolors.red(`Failed to install fumadocs-epub. Command: ${installCmd}`));
      if (stderr) console.error(stderr);
      process.exit(1);
    }
  }

  if (framework === 'next') {
    const secret = process.env.EXPORT_SECRET;
    if (!secret) {
      console.error(
        picocolors.red('EXPORT_SECRET is required for Next.js export. Set it in your environment.'),
      );
      process.exit(1);
    }
    const port = process.env.PORT || '3000';
    const url = `http://localhost:${port}/export/epub`;
    spin.start('Fetching EPUB from server');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${secret}` },
        signal: controller.signal,
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          console.error(
            picocolors.red('Auth failed. Check that EXPORT_SECRET matches the value in your app.'),
          );
        } else if (res.status === 404) {
          console.error(
            picocolors.red('Export route not found, run `fumadocs feature epub` to create it.'),
          );
        } else {
          console.error(
            picocolors.red(
              `Server returned ${res.status}. Ensure the app is running (e.g. pnpm start) on port ${port}.`,
            ),
          );
        }
        process.exit(1);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, buffer);
      spin.stop(picocolors.green(`EPUB saved to ${outputPath}`));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error(picocolors.red('Request timed out after 30 seconds.'));
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(picocolors.red(`Could not fetch EPUB: ${msg}`));
      }
      console.error(
        picocolors.yellow(`Ensure the server is running (e.g. pnpm start) on port ${port}.`),
      );
      process.exit(1);
    } finally {
      clearTimeout(timeoutId);
    }
    return;
  }

  const fullBuildPath = path.join(cwd, buildPath);
  if (!(await exists(fullBuildPath))) {
    console.error(
      picocolors.red(
        `EPUB not found at ${buildPath}. Run production build first (e.g. pnpm build).`,
      ),
    );
    process.exit(1);
  }

  spin.start('Copying EPUB');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.copyFile(fullBuildPath, outputPath);
  spin.stop(picocolors.green(`EPUB saved to ${outputPath}`));
}
