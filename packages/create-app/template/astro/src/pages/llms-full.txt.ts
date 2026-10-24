import type { APIRoute } from 'astro';
import { docsLlms } from '@/lib/source';

export const GET: APIRoute = async () => new Response(await docsLlms.full());
