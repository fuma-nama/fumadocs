/* eslint-disable */
import { ImageResponse, type NextRequest } from 'next/server'

export const runtime = 'edge'

const medium = fetch(new URL('./inter-medium.otf', import.meta.url)).then(res =>
  res.arrayBuffer()
)
const backgroundImage = fetch(
  new URL('./background.png', import.meta.url)
).then(res => res.arrayBuffer())

export async function GET(
  request: NextRequest,
  { params }: { params: { mode: string } }
) {
  const title = request.nextUrl.searchParams.get('title') ?? 'Next Docs',
    description =
      request.nextUrl.searchParams.get('description') ??
      'The Documentation Framework'

  const isUI = params.mode === 'ui'

  return new ImageResponse(
    (
      <div tw="flex flex-col w-full h-full p-14 justify-between">
        <img src={(await backgroundImage) as any} tw="absolute top-0 right-0" />
        <div tw="flex flex-row items-center mb-12">
          <div
            tw={`flex p-3 border-2 rounded-xl shadow-xl ${
              isUI
                ? 'shadow-blue-600 border-blue-400'
                : 'shadow-purple-600 border-purple-400'
            }`}
            style={{
              background: `linear-gradient(to bottom, black, ${
                isUI ? 'rgb(0,50,150)' : 'rgb(150,50,150)'
              })`
            }}
          >
            {isUI ? (
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgb(165 243 252)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <line x1="3" x2="21" y1="9" y2="9" />
                <line x1="9" x2="9" y1="21" y2="9" />
              </svg>
            ) : (
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgb(233 213 255)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m16 6 4 14" />
                <path d="M12 6v14" />
                <path d="M8 8v12" />
                <path d="M4 4v16" />
              </svg>
            )}
          </div>

          <p tw="text-gray-200 font-bold ml-6 text-4xl">
            {isUI ? 'Next Docs UI' : 'Next Docs Zeta'}
          </p>
        </div>
        <div
          tw="flex flex-col p-10 border border-gray-400/30 rounded-3xl"
          style={{
            background:
              'linear-gradient(to top, rgba(255,255,255,0.1), rgba(255,255,255,0.02))'
          }}
        >
          <p tw="text-white font-bold text-6xl">{title}</p>
          <p tw="text-gray-300 font-medium text-3xl">
            {description ?? 'The Documentation Framework'}
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Inter', data: await medium, weight: 500 }]
    }
  )
}
