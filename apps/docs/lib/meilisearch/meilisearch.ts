import 'server-only';

import { Meilisearch } from 'meilisearch';
export type { Meilisearch } from 'meilisearch';

const host = process.env.MEILISEARCH_HOST;
const apiKey = process.env.MEILISEARCH_KEY;
export const MEILISEARCH_INDEX = process.env.MEILISEARCH_INDEX || 'docs';

/**
 * Locales from result URLs by the URL normalizer,
 * as a comma-separated list, e.g. `cz,en`.
 */
export const MEILISEARCH_URL_LOCALES = (process.env.MEILISEARCH_URL_LOCALES ?? 'cz')
  .split(',')
  .map((locale) => locale.trim())
  .filter(Boolean);

/**
 * Base path restored on result URLs, e.g. `/docs`.
 */
export const MEILISEARCH_URL_BASE_PATH = process.env.MEILISEARCH_URL_BASE_PATH ?? '/docs';

if (!host) {
  throw new Error('Missing MEILISEARCH_HOST environment variable');
}

if (!apiKey) {
  throw new Error('Missing MEILISEARCH_KEY environment variable');
}

export const meiliClient = new Meilisearch({
  host,
  apiKey,
});
