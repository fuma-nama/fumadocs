import { getConfigRuntime } from '@/config/load-runtime';
import { normalizeProjects } from '@/lib/source/config';
import fs from 'node:fs/promises';
import path from 'node:path';

// file extension -> mime type
const supportedImageFormats: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const src = searchParams.get('src');
  // absolute path of page
  const pagePath = searchParams.get('page');
  // project dir
  const projectDir = searchParams.get('project');

  if (typeof src !== 'string' || typeof pagePath !== 'string' || typeof projectDir !== 'string') {
    return new Response(null, { status: 404 });
  }

  const config = await getConfigRuntime();
  const projects = normalizeProjects(config.content.projects);
  const project = projects.find((item) => item.dir === projectDir);
  if (!project) return new Response('invalid project directory', { status: 400 });

  const possiblePaths: string[] = [path.join(path.dirname(pagePath), src)];

  if (project.assetsDir) {
    for (const dir of project.assetsDir) {
      possiblePaths.push(path.join(dir, src));
    }
  } else {
    const rootDir = process.env.ROOT_DIR ?? process.cwd();
    possiblePaths.push(path.join(rootDir, src), path.join(rootDir, 'public', src));
  }

  const disableChecks = config.content.unsafe_disableFileSystemChecks;
  for (const file of possiblePaths) {
    if (!disableChecks && path.relative(project.dir, file).startsWith(`..${path.sep}`)) continue;

    const mimeType = supportedImageFormats[path.extname(file)];
    if (!mimeType) continue;

    try {
      return new Response(await fs.readFile(file), {
        headers: {
          'Content-Type': mimeType,
        },
      });
    } catch {
      continue;
    }
  }

  return new Response(null, { status: 404 });
}

export async function getConfig() {
  return {
    render: 'dynamic' as const,
  } as const;
}
