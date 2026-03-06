import { getConfigRuntime } from '@/config/load-runtime';
import { getSource } from '@/lib/source';
import { generate as DefaultImage } from 'fumadocs-ui/og/takumi';
import { ApiContext } from 'waku/router';

export async function GET(_: Request, { params }: ApiContext<'/og/[...slugs]/image.webp'>) {
  const { ImageResponse } = await import('@takumi-rs/image-response');
  const config = await getConfigRuntime();
  const page = (await getSource(config)).getPage(params.slugs);

  if (!page) return new Response(undefined, { status: 404 });

  return new ImageResponse(
    <DefaultImage title={page.data.title} description={page.data.description} site="Fumapress" />,
    {
      width: 1200,
      height: 630,
      format: 'webp',
    },
  );
}

export async function getConfig() {
  return {
    render: 'dynamic' as const,
  } as const;
}
