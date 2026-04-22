import { ImageResponse } from 'next/og';
import type { ReactNode } from 'react';
import type { ImageResponseOptions } from 'next/dist/compiled/@vercel/og/types';

interface GenerateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  primaryColor?: string;
  primaryTextColor?: string;
  site?: ReactNode;
}

export function generateOGImage(options: GenerateProps & ImageResponseOptions): ImageResponse {
  const { title, description, icon, site, primaryColor, primaryTextColor, ...rest } = options;

  return new ImageResponse(
    generate({
      title,
      description,
      icon,
      site,
      primaryTextColor,
      primaryColor,
    }),
    {
      width: 1200,
      height: 630,
      ...rest,
    },
  );
}

export function generate({
  primaryColor = 'rgba(255,150,255,0.3)',
  primaryTextColor = 'rgb(255,150,255)',
  icon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="56"
      height="56"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-book-icon lucide-book"
    >
      <circle cx="12" cy="12" r="11" stroke={primaryTextColor} strokeWidth="2" />
    </svg>
  ),
  ...props
}: GenerateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        color: 'white',
        padding: '4rem',
        backgroundColor: '#0c0c0c',
        border: `8px ${primaryColor}`,
      }}
    >
      <p
        style={{
          fontWeight: 800,
          fontSize: '82px',
          margin: 0,
        }}
      >
        {props.title}
      </p>
      <p
        style={{
          fontSize: '52px',
          color: 'rgba(240,240,240,0.8)',
          margin: 0,
          marginTop: '16px',
          paddingBottom: '28px',
          borderBottom: `8px dashed ${primaryColor}`,
        }}
      >
        {props.description}
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '20px',
          marginTop: 'auto',
          color: primaryTextColor,
        }}
      >
        {icon}
        {props.site && (
          <p
            style={{
              fontSize: '56px',
              fontWeight: 600,
              margin: 0,
            }}
          >
            {props.site}
          </p>
        )}
      </div>
    </div>
  );
}
