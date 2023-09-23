import type { NextApiRequest } from 'next'
import { ImageResponse } from 'next/server'

export const runtime = 'edge'

const medium = fetch(new URL('./inter-medium.otf', import.meta.url)).then(res =>
  res.arrayBuffer()
)
const bold = fetch(new URL('./inter-bold.otf', import.meta.url)).then(res =>
  res.arrayBuffer()
)

const foreground = 'hsl(0 0% 98%)'
const mutedForeground = 'hsl(0 0% 63.9%)'

export default async function handler(request: NextApiRequest) {
  const { searchParams } = new URL(request.url!)
  const title = searchParams.get('title'),
    description = searchParams.get('description'),
    mode = searchParams.get('mode')

  return new ImageResponse(
    OG({
      title: title ?? 'Next Docs',
      description: description ?? 'The Documentation Framework',
      isUI: mode === 'ui'
    }),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: await medium, weight: 500 },
        { name: 'Inter', data: await bold, weight: 700 }
      ]
    }
  )
}

const UIIcon = (
  <svg
    width="52"
    height="52"
    viewBox="0 0 24 24"
    fill="none"
    stroke={mutedForeground}
    stroke-width="2"
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <line x1="3" x2="21" y1="9" y2="9" />
    <line x1="9" x2="9" y1="21" y2="9" />
  </svg>
)

const LayoutIcon = (
  <svg
    width="52"
    height="52"
    viewBox="0 0 24 24"
    stroke={mutedForeground}
    stroke-width="2"
  >
    <path d="m16 6 4 14" />
    <path d="M12 6v14" />
    <path d="M8 8v12" />
    <path d="M4 4v16" />
  </svg>
)

function OG({
  title,
  description,
  isUI
}: {
  isUI: boolean
  title: string
  description: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '3.5rem',
        color: foreground,
        justifyContent: 'center',
        gap: '3rem',
        background: 'hsl(0 0% 3.9%)'
      }}
    >
      <div tw="flex flex-row items-center">
        <div
          style={{
            display: 'flex',
            padding: '0.75rem',
            border: `1px rgba(156,163,175,0.3)`,
            borderRadius: '0.75rem',
            background: `rgb(38, 38, 38)`
          }}
        >
          {isUI ? UIIcon : LayoutIcon}
        </div>

        <p
          style={{
            fontWeight: 500,
            marginLeft: '1.5rem',
            fontSize: '2.3rem'
          }}
        >
          {isUI ? 'Next Docs UI' : 'Next Docs Zeta'}
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '2.5rem',
          border: '1px rgba(156,163,175,0.3)',
          borderRadius: '1.5rem',
          background:
            'linear-gradient(to top, rgba(255,255,255,0.1), rgba(255,255,255,0.02))'
        }}
      >
        <p
          style={{
            fontWeight: 700,
            fontSize: '3.75rem'
          }}
        >
          {title}
        </p>
        <p
          style={{
            color: mutedForeground,
            fontWeight: 500,
            fontSize: '2rem'
          }}
        >
          {description}
        </p>
      </div>
    </div>
  )
}
