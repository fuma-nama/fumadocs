import { dynamicLoader } from 'fumadocs-core/source/dynamic';
import { createTinaCMSSource } from '@fumadocs/tinacms';
import { createClient } from 'tinacms/dist/client';

// with Tina Cloud, use the generated client instead:
// import { client } from '@/tina/__generated__/client';
const client = createClient({
  url: process.env.TINA_CONTENT_URL ?? 'http://localhost:4001/graphql',
  token: process.env.TINA_TOKEN,
  queries: () => ({}),
});

const source = dynamicLoader(
  createTinaCMSSource({
    client,
    collection: 'docs',
  }),
  {
    baseUrl: '/docs',
  },
);

export async function getSource() {
  // always fetch the latest content during development
  if (process.env.NODE_ENV === 'development') source.invalidate();

  return source.get();
}
