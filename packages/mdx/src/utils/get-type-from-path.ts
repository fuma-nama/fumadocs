import { extname } from 'node:path';
import { type SupportedType } from '@/config';

const docTypes = ['.mdx', '.md'];
const metaTypes = ['.json', '.yaml'];

export function getTypeFromPath(path: string): SupportedType | undefined {
  const ext = extname(path);

  if (docTypes.includes(ext)) return 'doc';
  if (metaTypes.includes(ext)) return 'meta';
}
