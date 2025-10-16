import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const baseDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../',
);
