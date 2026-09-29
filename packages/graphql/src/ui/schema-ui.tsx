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
import { Markdown } from './components/markdown';
import { EnumValueList } from './components/enum-values';
import { DirectiveList } from './components/type-annotation';

const TagCardClass = 'flex flex-col w-full bg-fd-secondary border rounded-lg shadow-md';
const TagCardTitleClass =
  'font-medium text-xs text-fd-muted-foreground rounded-t-[inherit] bg-fd-muted not-prose border-b';

const renderers: Omit<GenerateGraphQLSchemaUIOptions, 'translations'> = {
  renderMarkdown: (md) => <Markdown md={md} />,
  renderDirectives: (directives) => <DirectiveList directives={directives} />,
  renderArguments: (args) => <ArgumentsCard args={args} />,
  renderEnumValues: (type) => <ValuesCard type={type} />,
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

function ArgumentsCard({ args }: { args: readonly GraphQLArgument[] }) {
  const t = useTranslations({ note: 'graphql schema ui' });

  return (
    <div className={TagCardClass}>
      <p className={`${TagCardTitleClass} p-2`}>{t('Arguments')}</p>
      {args.map((arg) => (
        <div key={arg.name} className="text-xs px-2 py-1.5">
          <div className="flex items-center not-prose gap-2">
            <code className="font-medium text-fd-primary">{arg.name}</code>
            <code className="text-fd-muted-foreground">{String(arg.type)}</code>
            {isRequiredArgument(arg) && <span className="text-red-400">*</span>}
          </div>
          {arg.description && (
            <div className="prose-no-margin text-fd-muted-foreground mt-1">
              <Markdown md={arg.description} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ValuesCard({ type }: { type: GraphQLEnumType }) {
  const t = useTranslations({ note: 'graphql schema ui' });

  return (
    <div className={TagCardClass}>
      <p className={`${TagCardTitleClass} px-2 py-1.5`}>{t('Values')}</p>
      <EnumValueList type={type} className="p-2" />
    </div>
  );
}
