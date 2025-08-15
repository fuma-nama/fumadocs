import { exists } from '@/utils/fs';

export async function isSrc(): Promise<boolean> {
  return exists('./src');
}
