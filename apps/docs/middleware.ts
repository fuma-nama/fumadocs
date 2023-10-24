import { NextResponse, type NextRequest } from 'next/server'
import { modes } from './utils/modes'

const allowed = modes.map(mode => mode.param)

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (
    pathname.startsWith('/docs/') &&
    !allowed.includes(pathname.split('/')[2])
  ) {
    const url = new URL(
      '/docs/headless/' + pathname.slice('/docs/'.length),
      req.url
    )

    return NextResponse.redirect(url)
  }

  if (pathname === '/docs') {
    return NextResponse.redirect(new URL('/docs/headless', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/docs/:path*']
}
