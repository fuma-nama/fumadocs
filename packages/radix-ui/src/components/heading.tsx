'use client';
import { CopyCheckIcon, LinkIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from './ui/button';
import { useCopyButton } from '@/utils/use-copy-button';
import { useTranslations } from '@/contexts/i18n';

type Types = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type HeadingProps<T extends Types> = Omit<ComponentPropsWithoutRef<T>, 'as'> & {
  as?: T;
};

export function Heading<T extends Types = 'h1'>({ as, ...props }: HeadingProps<T>) {
  const As = as ?? 'h1';
  const t = useTranslations();
  const [isChecked, onCopy] = useCopyButton(() => {
    if (!props.id) return;

    const url = new URL(window.location.href);
    url.hash = props.id;
    return navigator.clipboard.writeText(url.href);
  });

  if (!props.id) return <As {...props} />;

  return (
    <As
      {...props}
      className={cn('group/heading flex scroll-m-28 flex-row items-center gap-1', props.className)}
    >
      <a data-card="" href={`#${props.id}`}>
        {props.children}
      </a>
      <button
        aria-label={t.headingCopyAnchor}
        className={cn(
          buttonVariants({
            variant: 'ghost',
            size: 'icon-xs',
          }),
          'not-prose shrink-0 text-fd-muted-foreground opacity-0 transition-opacity group-hover/heading:opacity-100',
        )}
        onClick={onCopy}
      >
        {isChecked ? <CopyCheckIcon /> : <LinkIcon />}
      </button>
    </As>
  );
}
