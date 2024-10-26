import { extname } from 'node:path';

const docTypes = ['.mdx', '.md'];
const metaTypes = ['.json', '.yaml'];

export function getTypeFromPath(path: string): 'doc' | 'meta' | undefined {
  const ext = extname(path);

  if (docTypes.includes(ext)) return 'doc';
  if (metaTypes.includes(ext)) return 'meta';
}
