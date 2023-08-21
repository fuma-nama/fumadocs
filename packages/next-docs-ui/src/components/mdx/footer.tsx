import { I18nContext } from '@/contexts/i18n'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'
import { useContext } from 'react'

export type FooterProps = {
  previous?: { name: string; url: string }
  next?: { name: string; url: string }
}

const item =
  'nd-flex nd-flex-row nd-gap-2 nd-items-end nd-text-muted-foreground'

export function Footer({ next, previous }: FooterProps) {
  const { footerNext = 'Next', footerPrevious = 'Previous' } =
    useContext(I18nContext).text ?? {}

  return (
    <div className="nd-flex nd-flex-row nd-gap-4 nd-mt-4 nd-flex-wrap nd-border-t nd-py-12">
      {previous && (
        <Link href={previous.url} className={item}>
          <ChevronLeftIcon className="nd-w-5 nd-h-5 nd-my-1" />
          <div>
            <p className="nd-text-xs">{footerPrevious}</p>
            <p className="nd-font-medium nd-text-foreground">{previous.name}</p>
          </div>
        </Link>
      )}
      {next && (
        <Link href={next.url} className={`${item} nd-ml-auto`}>
          <div>
            <p className="nd-text-xs">{footerNext}</p>
            <p className="nd-font-medium nd-text-foreground">{next.name}</p>
          </div>
          <ChevronRightIcon className="nd-w-5 nd-h-5 nd-my-1" />
        </Link>
      )}
    </div>
  )
}
