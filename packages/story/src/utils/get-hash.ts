import { createHash } from 'node:crypto';

export function getHash(v: string) {
  return createHash('MD5').update(v).digest('hex').slice(0, 12);
}
