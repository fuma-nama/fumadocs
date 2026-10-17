'use client';
import { ExternalLink } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { isScalarType } from 'graphql';
import { useNamedType } from '@/type-docs';
import { TypeHead } from '../components/type-annotation';

/** the SDL head of type, like `type Customer implements Node` */
export function TypeDefinition() {
  const t = useTranslations({ note: 'type page' });
  const { type } = useNamedType();

  return (
    <div className="not-prose flex min-h-11 items-start gap-3 rounded-xl border bg-fd-card p-1.5 ps-3.5 text-sm text-fd-card-foreground">
      <div className="flex min-w-0 flex-1 items-baseline gap-3 py-1.5 text-[0.8125rem] leading-5">
        <TypeHead interactive />
      </div>
      {isScalarType(type) && type.specifiedByURL && (
        <a
          href={type.specifiedByURL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 pe-2 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground"
        >
          <ExternalLink className="size-3.5" />
          {t('Specification')}
        </a>
      )}
    </div>
  );
}
