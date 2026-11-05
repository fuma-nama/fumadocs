import type { APIRoute } from 'astro';
import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

// zero config: the default `multilingual` mode works for every language
const server = createFromSource(source);

export const GET: APIRoute = () => server.staticGET();
