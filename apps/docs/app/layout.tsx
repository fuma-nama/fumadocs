import { Nav } from '@/components/nav'
import { ExternalLinkIcon, Star } from 'lucide-react'
import { RootProvider } from 'next-docs-ui/provider'
import { Inter } from 'next/font/google'
import 'next-docs-ui/style.css'
import './style.css'

export const metadata = {
  title: {
    template: '%s | Next Docs',
    default: 'Next Docs'
  },
  description: 'The headless ui library for building a documentation website',
  openGraph: {
    url: 'https://next-docs-zeta.vercel.app',
    title: {
      template: '%s | Next Docs',
      default: 'Next Docs'
    },
    description: 'The headless ui library for building a documentation website',
    images: '/banner.png',
    siteName: 'Next Docs'
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@money_is_shark',
    title: {
      template: '%s | Next Docs',
      default: 'Next Docs'
    },
    description: 'The headless ui library for building a documentation website',
    images: '/banner.png'
  },
  metadataBase:
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : `https://${process.env.VERCEL_URL}`
}

const inter = Inter({
  subsets: ['latin']
})

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="relative flex min-h-screen flex-col">
        <RootProvider
          search={{
            links: [
              ['Home', '/'],
              ['UI Docs', '/docs/ui'],
              ['Headless Docs', '/docs/headless']
            ]
          }}
        >
          <Nav />
          {children}
          <Footer />
        </RootProvider>
      </body>
    </html>
  )
}

function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto border-t py-12">
      <div className="container flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-semibold">NEXT DOCS</p>
          <p className="text-xs">Built with ❤️ by Fuma</p>
        </div>

        <div className="flex flex-row items-center gap-20">
          <a
            href="https://github.com/SonMooSans/next-docs"
            rel="noreferrer noopener"
            className="flex flex-row items-center text-sm"
          >
            <Star className="mr-2 h-4 w-4" />
            Give us a star
          </a>
          <a
            href="https://www.npmjs.com/package/next-docs-zeta"
            rel="noreferrer noopener"
            className="flex flex-row items-center text-sm"
          >
            <ExternalLinkIcon className="mr-2 h-4 w-4" />
            NPM registry
          </a>
        </div>
      </div>
    </footer>
  )
}
