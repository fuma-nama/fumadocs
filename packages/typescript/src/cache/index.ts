import { createHash } from 'node:crypto';

export interface Cache {
  read: (hash: string) => unknown | undefined | Promise<unknown | undefined>;
  write: (hash: string, value: unknown) => void | Promise<void>;
}

export function generateHash(str: string) {
  return createHash('SHA256').update(str).digest('hex').slice(0, 12);
}
