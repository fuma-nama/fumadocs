import path from 'node:path';
import { exists } from '@/utils/fs';

export async function isSrc(): Promise<boolean> {
  return exists('./src');
}

export function resolveAppPath(filePath: string, src: boolean): string {
  return src ? path.join('./src', filePath) : filePath;
}
