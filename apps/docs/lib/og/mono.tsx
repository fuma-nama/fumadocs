import { ImageResponse } from 'next/og';
import type { ReactNode } from 'react';
import fs from 'node:fs/promises';
import type { ImageResponseOptions } from 'next/server';

export interface GenerateProps {
  title: ReactNode;
  description?: ReactNode;
}

const font = await fs.readFile('./lib/og/JetBrainsMono-Regular.ttf');
const fontBold = await fs.readFile('./lib/og/JetBrainsMono-Bold.ttf');

export async function generateOGImage(
  options: GenerateProps & Partial<ImageResponseOptions>,
): Promise<ImageResponse> {
  const { title, description, ...rest } = options;

  return new ImageResponse(
    generate({
      title,
      description,
    }),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Mono',
          data: font,
          weight: 400,
        },
        {
          name: 'Mono',
          data: fontBold,
          weight: 600,
        },
      ],
      ...rest,
    },
  );
}

function generate({ title, description }: GenerateProps) {
  const siteName = 'Fumadocs';
  const primaryTextColor = 'rgb(240,240,240)';
  const logo = (
    <svg
      width="60"
      height="60"
      viewBox="0 0 180 180"
      filter="url(#logo-shadow)"
    >
      <circle cx="90" cy="90" r="86" fill="url(#logo-iconGradient)" />
      <defs>
        <filter id="logo-shadow" colorInterpolationFilters="sRGB">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="4"
            floodColor="white"
            floodOpacity="1"
          />
        </filter>
        <linearGradient id="logo-iconGradient" gradientTransform="rotate(45)">
          <stop offset="45%" stopColor="black" />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
      </defs>
    </svg>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        color: 'white',
        backgroundColor: 'rgb(10,10,10)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '4rem',
        }}
      >
        <p
          style={{
            fontWeight: 600,
            fontSize: '76px',
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: '48px',
            color: 'rgba(240,240,240,0.7)',
          }}
        >
          {description}
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '24px',
            marginTop: 'auto',
            color: primaryTextColor,
          }}
        >
          {logo}
          <p
            style={{
              fontSize: '46px',
              fontWeight: 600,
            }}
          >
            {siteName}
          </p>
        </div>
      </div>
    </div>
  );
}
