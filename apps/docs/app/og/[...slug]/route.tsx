import { readFileSync } from 'node:fs';
import { generateOGImage } from 'fumadocs-ui/og';
import { type ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { notFound } from 'next/navigation';
import { utils } from '@/app/source';

const font = readFileSync('./app/og/[...slug]/Geist-Regular.ttf');
const fontBold = readFileSync('./app/og/[...slug]/Geist-Bold.ttf');

export function GET(
  _: NextRequest,
  {
    params,
  }: {
    params: {
      slug: string[];
    };
  },
): ImageResponse {
  const page = utils.getPage(params.slug.slice(0, -1));
  if (!page) notFound();

  return generateOGImage({
    primaryTextColor: 'rgb(240,240,240)',
    primaryColor: 'rgba(255,255,255,0.3)',
    title: page.data.title,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="120"
        height="120"
        viewBox="0 0 24 24"
        stroke="url(#test)"
        style={{
          marginLeft: '-4px',
        }}
        strokeWidth="1"
        strokeLinecap="round"
        fill="rgb(0,0,0,0.8)"
        strokeLinejoin="round"
      >
        <linearGradient id="test" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="white" />
          <stop stopColor="rgb(100,100,100)" offset="100%" />
        </linearGradient>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <polyline points="11 3 11 11 14 8 17 11 17 3" />
      </svg>
    ),
    description: page.data.description,
    site: 'Fumadocs',
    fonts: [
      {
        name: 'Geist Regular',
        data: font,
        weight: 400,
      },
      {
        name: 'Geist Bold',
        data: fontBold,
        weight: 800,
      },
    ],
  });
}

export function generateStaticParams(): {
  slug: string[];
}[] {
  return utils.generateParams().map((param) => ({
    ...param,
    slug: [...param.slug, 'og.png'],
  }));
}
