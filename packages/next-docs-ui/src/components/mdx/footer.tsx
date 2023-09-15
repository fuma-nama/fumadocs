import { cva } from 'class-variance-authority'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'

export type FooterProps = {
  previous?: { name: string; url: string }
  next?: { name: string; url: string }
}

const item = cva(
  'nd-flex nd-flex-row nd-gap-2 nd-items-center nd-text-muted-foreground nd-transition-colors hover:nd-text-foreground'
)

export function Footer({ next, previous }: FooterProps) {
  return (
    <div className="nd-flex nd-flex-row nd-gap-4 nd-mt-4 nd-flex-wrap nd-border-t nd-py-12">
      {previous && (
        <Link href={previous.url} className={item()}>
          <ChevronLeftIcon className="nd-w-5 nd-h-5 nd-shrink-0" />
          <p className="nd-font-medium nd-text-foreground">{previous.name}</p>
        </Link>
      )}
      {next && (
        <Link href={next.url} className={item({ className: 'nd-ml-auto' })}>
          <p className="nd-text-end nd-font-medium nd-text-foreground">
            {next.name}
          </p>
          <ChevronRightIcon className="nd-w-5 nd-h-5 nd-shrink-0" />
        </Link>
      )}
    </div>
  )
}
