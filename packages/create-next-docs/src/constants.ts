import { fileURLToPath } from 'node:url';

export const sourceDir = fileURLToPath(new URL(`../`, import.meta.url).href);
export const cwd = process.cwd();
