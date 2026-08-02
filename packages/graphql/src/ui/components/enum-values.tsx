'use client';
import type { GraphQLEnumType } from 'graphql';
import { useTranslations } from '@fuma-translate/react';
import { cn } from '@/utils/cn';
import { Markdown } from './markdown';

export function EnumValueList({ type }: { type: GraphQLEnumType }) {
  const t = useTranslations({ note: 'enum values' });

  return (
    <div className="flex flex-col not-prose">
      {type.getValues().map((value) => (
        <div key={value.name} className="text-sm border-t py-3 first:border-t-0 first:pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <code
              className={cn(
                'font-medium font-mono text-fd-primary',
                value.deprecationReason != null && 'line-through opacity-80',
              )}
            >
              {value.name}
            </code>
            <div className="flex-1" />
            {value.deprecationReason != null && (
              <span className="text-xs font-mono text-yellow-600 dark:text-yellow-400">
                {t('Deprecated')}
              </span>
            )}
          </div>
          {value.description && (
            <div className="prose-no-margin text-fd-muted-foreground pt-1.5">
              <Markdown md={value.description} />
            </div>
          )}
          {value.deprecationReason && (
            <div className="prose-no-margin text-fd-muted-foreground text-xs pt-1.5">
              <Markdown md={value.deprecationReason} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
