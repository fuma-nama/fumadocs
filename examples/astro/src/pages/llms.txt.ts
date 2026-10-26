import type { APIRoute } from 'astro';
import { docsLlms } from '@/lib/source';

export const GET: APIRoute = () => new Response(docsLlms.index());
