import { type ImageResponseOptions } from '@takumi-rs/image-response';
import type { ReactNode } from 'react';
import fs from 'node:fs/promises';

export interface GenerateProps {
  title: ReactNode;
  description?: ReactNode;
}

const font = fs.readFile('./lib/og/JetBrainsMono-Regular.ttf');
const fontBold = fs.readFile('./lib/og/JetBrainsMono-Bold.ttf');

export async function getImageResponseOptions(): Promise<ImageResponseOptions> {
  return {
    format: 'webp',
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Mono',
        data: await font,
        weight: 400,
      },
      {
        name: 'Mono',
        data: await fontBold,
        weight: 600,
      },
    ],
  };
}

export function generate({ title, description }: GenerateProps) {
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
        <span
          style={{
            fontWeight: 600,
            fontSize: '76px',
          }}
        >
          {title}
        </span>
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
          <span
            style={{
              fontSize: '46px',
              fontWeight: 600,
            }}
          >
            {siteName}
          </span>
        </div>
      </div>
    </div>
  );
}
