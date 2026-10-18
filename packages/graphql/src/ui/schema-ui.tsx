'use client';
import { useMemo } from 'react';
import type { GraphQLEnumType } from 'graphql';
import { useTranslations } from '@fuma-translate/react';
import { SchemaUI } from 'shared-api/components/schema';
import { type SchemaViewProps, useGraphQL } from '@/utils/create-page';
import {
  type GenerateGraphQLSchemaUIOptions,
  generateGraphQLSchemaUI,
} from '@/utils/generate-schema-ui';
import { cn } from '@/utils/cn';
import { Markdown } from './components/markdown';
import { chipClassName, DetailsPopover, detailsMarkdownClassName } from './components/chip';
import { DeprecatedLabel, DeprecationReason, Directives } from './components/directive';

const renderers: Omit<GenerateGraphQLSchemaUIOptions, 'translations'> = {
  renderMarkdown: (md) => <Markdown md={md} />,
  // the chips join the other tags
  renderDirectives: (directives) => <Directives directives={directives} className="contents" />,
  renderEnumValues: (type) => <EnumValues type={type} />,
};

export function GraphQLSchemaView({ client, root }: SchemaViewProps) {
  const { schema } = useGraphQL();
  const translations = useTranslations().translations;
  const generated = useMemo(
    () => generateGraphQLSchemaUI(schema, root, { translations, ...renderers }),
    [schema, root, translations],
  );

  return <SchemaUI {...client} generated={generated} />;
}

/** the values of an enum as chips, a value opens its description and deprecation */
function EnumValues({ type }: { type: GraphQLEnumType }) {
  const t = useTranslations({ note: 'graphql schema ui' });

  return (
    <div className="not-prose flex w-full flex-wrap items-center gap-1.5 text-xs">
      {t('Value in')}
      {type.getValues().map(({ name, description, deprecationReason }) => {
        if (!description && deprecationReason == null)
          return (
            <code key={name} className={chipClassName}>
              {name}
            </code>
          );

        const className = deprecationReason != null ? 'line-through' : undefined;
        return (
          <DetailsPopover
            key={name}
            className={className}
            details={
              <>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className={cn('font-mono text-[0.8125rem] font-medium', className)}>
                    {name}
                  </span>
                  {deprecationReason != null && <DeprecatedLabel />}
                </p>
                {description && (
                  <div className={cn('mt-1.5', detailsMarkdownClassName)}>
                    <Markdown md={description} />
                  </div>
                )}
                {deprecationReason && (
                  <DeprecationReason
                    reason={deprecationReason}
                    className="mt-1.5 text-xs leading-relaxed"
                  />
                )}
              </>
            }
          >
            {name}
          </DetailsPopover>
        );
      })}
    </div>
  );
}
