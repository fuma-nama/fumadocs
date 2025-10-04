import { createFromSource } from 'fumadocs-core/search/server';
import type { LoaderFunctionArgs } from 'react-router';
import { source } from '../../lib/source.js';

const server = createFromSource(source, {
  language: 'english',
});

export async function loader({ request }: LoaderFunctionArgs) {
  return server.GET(request);
}
