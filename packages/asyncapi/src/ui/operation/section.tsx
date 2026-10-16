'use client';
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { dereference } from '@fumadocs/json-schema';
import type { ExternalDocumentationObject, ReferenceObject } from '@/types';
import { Heading } from '@/ui/components/heading';

export function SectionHeader({
  id,
  depth,
  title,
  children,
}: {
  id: string;
  depth: number;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mt-10 mb-3 flex flex-wrap items-center gap-2 first:mt-0">
      <Heading id={id} depth={depth} className="my-0!">
        {title}
      </Heading>
      <div className="ms-auto flex min-w-0 items-center">{children}</div>
    </div>
  );
}

export function ExternalDocs({
  docs,
}: {
  docs: ExternalDocumentationObject | ReferenceObject | undefined;
}) {
  const t = useTranslations({ note: 'external documentation' });
  const resolved = dereference(docs);
  if (!resolved) return null;

  return (
    <a
      href={resolved.url}
      target="_blank"
      rel="noreferrer noopener"
      className="not-prose inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground"
    >
      <ExternalLink className="size-3.5" />
      {resolved.description ?? t('Documentation')}
    </a>
  );
}
