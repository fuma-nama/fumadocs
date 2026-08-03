'use client';
import type { GraphQLEnumType } from 'graphql';
import { useTranslations } from '@fuma-translate/react';
import { cn } from '@/utils/cn';
import { Badge } from './badge';
import { Markdown } from './markdown';

export function EnumValueList({ type, className }: { type: GraphQLEnumType; className?: string }) {
  const t = useTranslations({ note: 'enum values' });

  return (
    <div className={cn('flex flex-col', className)}>
      {type.getValues().map((value) => (
        <div key={value.name} className="border-t py-1.5 first:border-t-0 first:pt-0 last:pb-0">
          <code
            className={cn(
              'font-medium font-mono text-xs text-fd-primary not-prose',
              value.deprecationReason != null && 'line-through opacity-80',
            )}
          >
            {value.name}
          </code>
          {value.description && (
            <div className="prose-no-margin text-xs text-fd-muted-foreground pt-1.5">
              <Markdown md={value.description} />
            </div>
          )}
          {value.deprecationReason != null && (
            <div className="flex flex-wrap gap-1.5 items-center pt-2 text-xs">
              <Badge color="yellow">{t('Deprecated')}</Badge>
              <div className="prose-no-margin text-fd-muted-foreground empty:hidden">
                <Markdown md={value.deprecationReason} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
