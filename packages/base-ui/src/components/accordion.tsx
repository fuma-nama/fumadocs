'use client';

import { Check, Link as LinkIcon } from 'lucide-react';
import { ComponentProps, type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@fumadocs/ui/cn';
import { useCopyButton } from '@fumadocs/ui/hooks/use-copy-button';
import { buttonVariants } from '@/components/ui/button';
import { mergeRefs } from '@fumadocs/ui/merge-refs';
import {
  Accordion as Root,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function Accordions({
  ref,
  className,
  defaultValue,
  ...props
}: ComponentProps<typeof Root>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const composedRef = mergeRefs(ref, rootRef);
  const [value, setValue] = useState<string[]>(defaultValue ?? []);

  useEffect(() => {
    const id = window.location.hash.substring(1);
    const element = rootRef.current;
    if (!element || id.length === 0) return;

    const selected = document.getElementById(id);
    if (!selected || !element.contains(selected)) return;
    const value = selected.getAttribute('data-accordion-value');

    if (value) setValue((prev) => [value, ...prev]);
  }, []);

  return (
    <Root
      ref={composedRef}
      value={value}
      onValueChange={setValue}
      className={(s) =>
        cn(
          'divide-y divide-fd-border overflow-hidden rounded-lg border bg-fd-card',
          typeof className === 'function' ? className(s) : className,
        )
      }
      {...props}
    />
  );
}

export function Accordion({
  title,
  id,
  value = String(title),
  children,
  ...props
}: Omit<ComponentProps<typeof AccordionItem>, 'value' | 'title'> & {
  title: string | ReactNode;
  value?: string;
}) {
  return (
    <AccordionItem value={value} {...props}>
      <AccordionHeader id={id} data-accordion-value={value}>
        <AccordionTrigger>{title}</AccordionTrigger>
        {id ? <CopyButton id={id} /> : null}
      </AccordionHeader>
      <AccordionContent hiddenUntilFound>
        <div className="px-4 pb-2 text-[0.9375rem] prose-no-margin [&[hidden]:not([hidden='until-found'])]:hidden">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function CopyButton({ id }: { id: string }) {
  const [checked, onClick] = useCopyButton(() => {
    const url = new URL(window.location.href);
    url.hash = id;

    return navigator.clipboard.writeText(url.toString());
  });

  return (
    <button
      type="button"
      aria-label="Copy Link"
      className={cn(
        buttonVariants({
          color: 'ghost',
          className: 'text-fd-muted-foreground me-2',
        }),
      )}
      onClick={onClick}
    >
      {checked ? <Check className="size-3.5" /> : <LinkIcon className="size-3.5" />}
    </button>
  );
}
