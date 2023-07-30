import { LanguageSelect } from 'next-docs-ui/i18n'
import { DocsLayout } from 'next-docs-ui/layout'
import { RootProvider } from 'next-docs-ui/provider'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import { ClientI18nProvider } from '../provider'
import { trees } from '../tree'
import 'next-docs-ui/style.css'
import '../style.css'

const inter = Inter({
  subsets: ['latin']
})

export default function Layout({
  params,
  children
}: {
  params: { lang: string }
  children: ReactNode
}) {
  const tree = trees[params.lang]

  return (
    <html lang={params.lang} className={inter.className}>
      <body
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh'
        }}
      >
        <ClientI18nProvider>
          <RootProvider>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: -1,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100%',
                  height: 500,
                  background:
                    'linear-gradient(to bottom left, hsl(var(--gradient) / 0.5), hsl(var(--background)) 50%)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: 500,
                  background:
                    'linear-gradient(to top right, hsl(650 50% 50% / 0.2), transparent 30%)'
                }}
              />
            </div>
            <DocsLayout
              tree={tree ?? []}
              navTitle="My App"
              githubUrl="https://github.com/SonMooSans/next-docs"
              sidebarContent={
                <LanguageSelect
                  languages={[
                    {
                      name: 'English',
                      locale: 'en'
                    },
                    {
                      name: 'Chinese',
                      locale: 'cn'
                    }
                  ]}
                />
              }
            >
              {children}
            </DocsLayout>
          </RootProvider>
        </ClientI18nProvider>
      </body>
    </html>
  )
}
