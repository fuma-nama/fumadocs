import { createFromSource, SearchAPI } from 'fumadocs-core/search/server';
import type { LoaderFunctionArgs } from 'react-router';
import { getSource } from '../../lib/source';

let server: SearchAPI | undefined;

export async function loader({ request }: LoaderFunctionArgs) {
  server ??= createFromSource(await getSource(), {
    language: 'english',
  });

  return server.GET(request);
}
