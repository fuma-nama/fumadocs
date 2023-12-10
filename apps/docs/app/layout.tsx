import { Provider } from './provider'
import './style.css'
import { Nav } from '@/components/nav'
import { base_url, createMetadata } from '@/utils/metadata'
import { Star } from 'lucide-react'
import type { Viewport } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'

export const metadata = createMetadata({
  title: {
    template: '%s | Next Docs',
    default: 'Next Docs'
  },
  description: 'The Next.js framework for building documentation sites',
  metadataBase: base_url
})

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#fff' }
  ]
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
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>
          <Nav />
          {children}
          <Footer />
        </Provider>
      </body>
    </html>
  )
}

function Footer() {
  return (
    <footer className="bg-card text-secondary-foreground mt-auto border-t py-12">
      <div className="container flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-semibold">NEXT DOCS</p>
          <p className="text-xs">
            Built with ❤️ by{' '}
            <a
              href="https://fuma-dev.vercel.app"
              rel="noreferrer noopener"
              target="_blank"
              className="font-medium"
            >
              Fuma
            </a>
          </p>
        </div>

        <div className="flex flex-row flex-wrap items-center gap-12">
          <a
            href="https://github.com/fuma-nama/next-docs"
            rel="noreferrer noopener"
            className="text-muted-foreground hover:text-accent-foreground flex flex-row items-center text-sm transition-colors"
          >
            <Star className="mr-2 h-4 w-4" />
            Give us a star
          </a>
          <Link
            href="/showcase"
            className="text-muted-foreground hover:text-accent-foreground flex flex-row items-center text-sm transition-colors"
          >
            Showcase
          </Link>
        </div>
      </div>
    </footer>
  )
}
