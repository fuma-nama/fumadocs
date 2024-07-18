import env from '@next/env';
import { writeOgImages } from './generate-og-images';
import { updateSearchIndexes } from './update-index.mjs';
import { readFile } from 'node:fs/promises';
import type { SearchIndex } from 'fumadocs-mdx';

env.loadEnvConfig(process.cwd());

const path = '.next/server/chunks/fumadocs_search.json';

const indexes = JSON.parse((await readFile(path)).toString()) as SearchIndex[];

void Promise.all([writeOgImages(indexes), updateSearchIndexes(indexes)]);
