import type { APIRoute } from 'astro';
import { getStaticPaths as getPaths, type FileRoute } from '../app';

export const getStaticPaths = () => getPaths('file', 'fumadocsFile');

export const GET: APIRoute = (context) =>
  (context.props as { route: FileRoute }).route.GET(context);
