'use client';
import { useMemo } from 'react';
import { type GraphQLArgument, type GraphQLEnumType, isRequiredArgument } from 'graphql';
import { useTranslations } from '@fuma-translate/react';
import { SchemaUI } from 'shared-api/components/schema';
import { type SchemaViewProps, useGraphQL } from '@/utils/create-page';
import {
  type GenerateGraphQLSchemaUIOptions,
  generateGraphQLSchemaUI,
} from '@/utils/generate-schema-ui';
import { printDefaultValue } from '@/utils/sdl';
import { cn } from '@/utils/cn';
import { Markdown } from './components/markdown';
import { chipClassName, ChipPopover, detailsMarkdownClassName } from './components/chip';
import { Directives } from './components/directive';
import { TypeAnnotation } from './components/type-annotation';

const renderers: Omit<GenerateGraphQLSchemaUIOptions, 'translations'> = {
  renderMarkdown: (md) => <Markdown md={md} />,
  // the chips join the other tags
  renderDirectives: (directives) => <Directives directives={directives} className="contents" />,
  renderArguments: (args) => <ArgumentList args={args} />,
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

/** the arguments of a field, nested under its description */
function ArgumentList({ args }: { args: readonly GraphQLArgument[] }) {
  const t = useTranslations({ note: 'graphql schema ui' });

  return (
    <div className="flex w-full flex-col gap-1.5 text-xs">
      <span className="not-prose">{t('Arguments')}</span>
      <div className="flex flex-col gap-2 border-s ps-3">
        {args.map((arg) => {
          const { deprecationReason } = arg;
          const value = printDefaultValue(arg.default, arg.type);

          return (
            <div key={arg.name}>
              <p className="not-prose flex flex-wrap items-baseline gap-x-2 font-mono">
                <span className="font-medium">
                  <span
                    className={cn(
                      'text-fd-primary',
                      deprecationReason != null && 'line-through opacity-80',
                    )}
                  >
                    {arg.name}
                  </span>
                  {isRequiredArgument(arg) && <span className="text-red-400">*</span>}
                </span>
                <TypeAnnotation type={arg.type} />
                {value !== undefined && <span>= {value}</span>}
                {deprecationReason != null && (
                  <span className="text-yellow-600 dark:text-yellow-400">{t('Deprecated')}</span>
                )}
              </p>
              {arg.description && (
                <div className="mt-0.5 prose-no-margin">
                  <Markdown md={arg.description} />
                </div>
              )}
              {deprecationReason && (
                <div className="mt-0.5 prose-no-margin">
                  <Markdown md={deprecationReason} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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
          <ChipPopover
            key={name}
            className={className}
            details={
              <>
                <p className={cn('font-mono text-[0.8125rem] font-medium', className)}>{name}</p>
                {description && (
                  <div className={cn('mt-1.5', detailsMarkdownClassName)}>
                    <Markdown md={description} />
                  </div>
                )}
                {deprecationReason != null && (
                  <div className="mt-1.5 flex items-baseline gap-1.5 text-xs">
                    <span className="shrink-0 font-mono text-yellow-600 dark:text-yellow-400">
                      {t('Deprecated')}
                    </span>
                    <div className={cn('min-w-0', detailsMarkdownClassName)}>
                      <Markdown md={deprecationReason} />
                    </div>
                  </div>
                )}
              </>
            }
          >
            {name}
          </ChipPopover>
        );
      })}
    </div>
  );
}
