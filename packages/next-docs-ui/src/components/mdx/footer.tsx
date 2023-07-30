import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'

export type FooterProps = {
  previous?: { name: string; url: string }
  next?: { name: string; url: string }
}

const item =
  'nd-flex nd-flex-row nd-gap-2 nd-items-end nd-text-sm nd-text-muted-foreground'

export function Footer({ next, previous }: FooterProps) {
  return (
    <div className="nd-flex nd-flex-row nd-mt-8 nd-gap-4 nd-flex-wrap">
      {previous && (
        <Link href={previous.url} className={item}>
          <ChevronLeftIcon className="nd-w-5 nd-h-5" />
          <div>
            <p className="nd-text-xs">Previous</p>
            <p className="nd-font-medium nd-text-foreground">{previous.name}</p>
          </div>
        </Link>
      )}
      {next && (
        <Link href={next.url} className={`${item} nd-ml-auto`}>
          <div>
            <p className="nd-text-xs">Next</p>
            <p className="nd-font-medium nd-text-foreground">{next.name}</p>
          </div>
          <ChevronRightIcon className="nd-w-5 nd-h-5" />
        </Link>
      )}
    </div>
  )
}
