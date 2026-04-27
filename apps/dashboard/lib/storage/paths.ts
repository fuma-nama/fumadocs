const allowedEditorPath = /^[\w./@-]+$/;

export function normalizeEditorPath(path: string) {
  const normalized = path
    .replaceAll('\\', '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.')
    .join('/');

  if (normalized.includes('..') || (normalized.length > 0 && !allowedEditorPath.test(normalized))) {
    throw new Response('Invalid path', { status: 400 });
  }

  return normalized;
}

export function ensureMdxPath(path: string) {
  const normalized = normalizeEditorPath(path);
  if (!normalized.endsWith('.md') && !normalized.endsWith('.mdx')) {
    return `${normalized}.mdx`;
  }
  return normalized;
}

export function joinS3Key(...parts: string[]) {
  return parts
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

export function contentKey(projectPrefix: string, path: string) {
  return joinS3Key(projectPrefix, 'content', ensureMdxPath(path));
}

export function yjsStateKey(projectPrefix: string, path: string) {
  return joinS3Key(
    projectPrefix,
    'yjs',
    `${Buffer.from(ensureMdxPath(path)).toString('base64url')}.bin`,
  );
}

export function assetKey(projectPrefix: string, assetId: string, filename: string) {
  return joinS3Key(
    projectPrefix,
    'assets',
    assetId,
    normalizeEditorPath(filename).split('/').at(-1) ?? filename,
  );
}
