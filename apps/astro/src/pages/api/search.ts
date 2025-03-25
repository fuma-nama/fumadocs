import type { APIRoute } from 'astro';
import { createSearchAPI } from 'fumadocs-core/search/server';
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');

export const prerender = false;

const server = createSearchAPI('simple', {
  indexes: posts.map((docs) => ({
    title: docs.data.title,
    description: docs.data.description,
    content: docs.body!,
    url: `/blog/${docs.id}`,
  })),
});
export const GET: APIRoute = ({ request }) => {
  return server.GET(request);
};
