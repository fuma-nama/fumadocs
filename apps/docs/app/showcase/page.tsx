import NextFAQImage from '@/public/showcases/next-faq.png'
import YeecordImage from '@/public/showcases/yeecord.png'
import { createMetadata } from '@/utils/metadata'
import { PlusIcon } from 'lucide-react'
import Image from 'next/image'

export const metadata = createMetadata({
  title: 'Showcase',
  description: 'Some cool websites using Next Docs',
  openGraph: {
    url: 'https://next-docs-zeta.vercel.app/showcase'
  }
})

export default function Showcase() {
  const showcases = [
    [
      NextFAQImage,
      'Next.js Discord Common Questions',
      'https://nextjs-discord-common-questions.joulev.dev'
    ],
    [YeecordImage, 'Yeecord Docs', 'https://yeecord.com']
  ] as const

  return (
    <main className="container py-20">
      <h1 className="font-bold text-3xl mb-4">Showcase</h1>
      <p className="text-muted-foreground">
        Some cool websites using Next Docs
      </p>
      <div className="grid grid-cols-1 gap-4 mt-8 animate-in fade-in slide-in-from-bottom-20 duration-700 md:grid-cols-2 xl:grid-cols-3">
        {showcases.map(([image, name, href], key) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="relative border rounded-lg group overflow-hidden transition-colors shadow-lg hover:shadow-primary/10 hover:border-primary/30"
          >
            <Image alt="Preview" src={image} placeholder="blur" />
            <p className="absolute inset-x-0 bottom-0 p-6 pt-8 mt-2 text-white text-sm font-medium bg-gradient-to-t from-black transition-all group-hover:[background-position-y:50px] bg-no-repeat">
              {name}
            </p>
          </a>
        ))}

        <a
          href="https://github.com/fuma-nama/next-docs/discussions/30"
          target="_blank"
          rel="noreferrer noopener"
          className="p-8 flex flex-col items-center text-center justify-center border rounded-lg bg-card text-muted-foreground transition-colors hover:bg-muted/80 hover:text-accent-foreground"
        >
          <PlusIcon className="w-7 h-7 mb-2" />
          <p className="text-sm">Add Your Own</p>
        </a>
      </div>
    </main>
  )
}
