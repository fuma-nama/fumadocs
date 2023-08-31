import { readFile } from 'fs/promises'
import path from 'path'
import { ImageResponse, type NextRequest } from 'next/server'

const medium = readFile(path.resolve('./public/inter-medium.woff'))
const bold = readFile(path.resolve('./public/inter-bold.woff'))
const backgroundImage = readFile(path.resolve('./public/background.png')).then(
  res => res.buffer
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
      isUI: params.mode === 'ui',
      backgroundImage
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
