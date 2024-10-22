import { ImageResponse } from 'next/og';
import type { ReactElement, ReactNode } from 'react';
import type { ImageResponseOptions } from 'next/dist/compiled/@vercel/og/types';

interface GenerateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  primaryColor?: string;
  primaryTextColor?: string;
  site?: ReactNode;
}

export function generateOGImage(
  options: GenerateProps & ImageResponseOptions,
): ImageResponse {
  const {
    title,
    description,
    icon,
    site,
    primaryColor,
    primaryTextColor,
    ...rest
  } = options;

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
  primaryColor = 'rgba(255,150,255,0.5)',
  primaryTextColor = 'rgb(255,150,255)',
  ...props
}: GenerateProps): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        color: 'white',
        backgroundColor: '#0c0c0c',
        backgroundImage: `linear-gradient(to right top, ${primaryColor}, transparent)`,
      }}
    >
      <GridPattern
        squares={[
          [0, 3],
          [5, 3],
          [1, 2],
          [3, 0],
        ]}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '4rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '12px',
            color: primaryTextColor,
          }}
        >
          {props.icon}
          <p
            style={{
              fontSize: '56px',
              fontWeight: 600,
            }}
          >
            {props.site}
          </p>
        </div>

        <p
          style={{
            fontWeight: 800,
            fontSize: '82px',
          }}
        >
          {props.title}
        </p>
        <p
          style={{
            fontSize: '52px',
            color: 'rgba(240,240,240,0.7)',
          }}
        >
          {props.description}
        </p>
      </div>
    </div>
  );
}

interface GridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  squares?: [x: number, y: number][];
  strokeDasharray?: number;
  className?: string;
}

export function GridPattern({
  width = 100,
  height = 100,
  x = -1,
  y = -1,
  squares,
  strokeDasharray,
  ...props
}: GridPatternProps): ReactElement {
  return (
    <svg
      fill="rgba(156, 163, 175, 0.2)"
      stroke="rgba(156, 163, 175, 0.2)"
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        maskImage: 'radial-gradient(circle at 0% 100%, white, transparent)',
      }}
      viewBox="0 0 600 400"
      {...props}
    >
      <defs>
        <pattern
          id="og-pattern"
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M.5 ${height.toString()}V.5H${width.toString()}`}
            fill="none"
            strokeWidth={1}
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect
        width="600"
        height="600"
        strokeWidth={0}
        fill="url(#og-pattern)"
        x={x}
        y={y}
      />
      {squares?.map(([itemX, itemY]) => (
        <rect
          strokeWidth="0"
          key={`${itemX.toString()}-${itemY.toString()}`}
          width={width - 1}
          height={height}
          x={itemX * width + 1}
          y={itemY * (height + 1)}
        />
      ))}
    </svg>
  );
}
