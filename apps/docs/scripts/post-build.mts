import { loadEnvConfig } from '@next/env';
import { writeOgImages } from './generate-og-images';
import { updateSearchIndexes } from './update-index.mjs';

loadEnvConfig(process.cwd());

void Promise.all([writeOgImages(), updateSearchIndexes()]);
