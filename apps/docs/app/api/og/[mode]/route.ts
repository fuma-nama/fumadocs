import { ImageResponse, type NextRequest } from 'next/server'
import { OG } from './og'

export const runtime = 'edge'

const medium = fetch(new URL('./inter-medium.otf', import.meta.url)).then(res =>
  res.arrayBuffer()
)
const bold = fetch(new URL('./inter-bold.otf', import.meta.url)).then(res =>
  res.arrayBuffer()
)

export async function GET(
  request: NextRequest,
  { params }: { params: { mode: string } }
) {
  const title = request.nextUrl.searchParams.get('title'),
    description = request.nextUrl.searchParams.get('description')

  return new ImageResponse(
    OG({
      title: title ?? 'Next Docs',
      description: description ?? 'The Documentation Framework',
      isUI: params.mode === 'ui'
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
