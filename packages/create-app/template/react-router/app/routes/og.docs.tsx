import { ImageResponse } from '@takumi-rs/image-response';
import type { Route } from './+types/og.docs';
import { generate as DefaultImage } from 'fumadocs-ui/og/takumi';
import { source } from '@/lib/source';

export function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*']
    .split('/')
    .filter((v) => v.length > 0)
    .slice(0, -1);
  const page = source.getPage(slugs);

  if (!page) throw new Response(undefined, { status: 404 });

  return new ImageResponse(
    <DefaultImage title={page.data.title} description={page.data.description} site="My App" />,
    {
      width: 1200,
      height: 630,
      format: 'webp',
    },
  );
}
