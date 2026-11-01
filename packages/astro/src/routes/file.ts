import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from 'astro';
import { getStaticPaths as getPaths, handleFileRoute } from '../app';

export const getStaticPaths = (() => getPaths('file', 'fumadocsFile')) satisfies GetStaticPaths;

export const GET: APIRoute<InferGetStaticPropsType<typeof getStaticPaths>> = (context) =>
  handleFileRoute(context.props.route, context);
