'use client';
import * as TocDefault from '@/components/toc/default';
import * as TocClerk from '@/components/toc/clerk';
import { TOCScrollArea } from '@/components/toc';
import { I18nLabel } from '@/contexts/i18n';
import { cn } from '@/utils/cn';
import { Text } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

export interface TOCProps {
  container?: ComponentProps<'div'>;
  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;

  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;

  /**
   * @defaultValue 'normal'
   */
  style?: 'normal' | 'clerk';
}

export function TOC({ container, header, footer, style }: TOCProps) {
  return (
    <div
      id="nd-toc"
      {...container}
      className={cn(
        'sticky top-(--fd-docs-row-1) h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] flex flex-col [grid-area:toc] w-(--fd-toc-width) pt-12 pe-4 pb-2 max-xl:hidden',
        container?.className,
      )}
    >
      {header}
      <h3
        id="toc-title"
        className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground"
      >
        <Text className="size-4" />
        <I18nLabel label="toc" />
      </h3>
      <TOCScrollArea>
        {style === 'clerk' ? <TocClerk.TOCItems /> : <TocDefault.TOCItems />}
      </TOCScrollArea>
      {footer}
    </div>
  );
}
