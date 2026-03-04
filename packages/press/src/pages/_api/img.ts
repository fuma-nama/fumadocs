import { getConfigRuntime } from '@/config/load-runtime';
import { normalizeProjects } from '@/lib/source/config';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

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
  const projects = normalizeProjects(config.content?.projects);
  const project = projects.find((item) => item.dir === projectDir);
  const possiblePaths = [path.join(path.dirname(pagePath), src)];

  if (project?.assetsDir) {
    possiblePaths.push(...project.assetsDir.map((dir) => path.join(dir, src)));
  } else {
    possiblePaths.push(path.join(projectDir, src), path.join(projectDir, 'public', src));
  }

  const targetFile = possiblePaths.find((file) => existsSync(file));

  if (!targetFile) return new Response(null, { status: 404 });
  return new Response(await fs.readFile(targetFile));
}

export async function getConfig() {
  return {
    render: 'dynamic' as const,
  } as const;
}
