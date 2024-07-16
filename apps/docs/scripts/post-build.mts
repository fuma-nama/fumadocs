import env from '@next/env';
import { writeOgImages } from './generate-og-images';
import { updateSearchIndexes } from './update-index.mjs';

env.loadEnvConfig(process.cwd());

void Promise.all([writeOgImages(), updateSearchIndexes()]);
