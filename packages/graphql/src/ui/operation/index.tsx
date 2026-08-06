'use client';
import { type ReactNode, useMemo } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { AnchorSection } from '@fumadocs/api-docs/auto-anchor/client';
import { isRequiredArgument } from 'graphql';
import { Callout } from 'fumadocs-ui/components/callout';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import {
  getCustomDirectives,
  getOperationField,
  getOperationTitle,
  type OperationKind,
} from '@/utils/schema';
import { generateOperationExample } from '@/utils/example';
import { generateRequestSnippets } from '@/utils/snippets';
import { OperationPlayground } from '@/playground';
import { KindLabel } from '../components/badge';
import { Heading } from '../components/heading';
import { Markdown } from '../components/markdown';
import { ClientCodeBlock } from '../components/codeblock';
import { DirectiveList, TypeAnnotation } from '../components/type-annotation';
import { useRenderContext } from '../contexts/api';

export function Operation({
  kind,
  name,
  showTitle,
  showDescription,
  headingLevel = 2,
}: {
  kind: OperationKind;
  name: string;
  showTitle?: boolean;
  showDescription?: boolean;
  headingLevel?: number;
}) {
  const t = useTranslations({ note: 'operation page' });
  const ctx = useRenderContext();
  const { schema } = ctx.schema;
  const field = useMemo(() => {
    const field = getOperationField(schema, kind, name);
    if (!field)
      throw new Error(`[Fumadocs GraphQL] Operation not found in schema: ${kind} ${name}`);

    return field;
  }, [schema, kind, name]);

  let headNode: ReactNode = null;
  if (showTitle) {
    const title = getOperationTitle(name);

    headNode = (
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <Heading id={title} depth={headingLevel} className="my-0!">
          {title}
        </Heading>
        <KindLabel className="text-xs">{kind}</KindLabel>
      </div>
    );
    headingLevel++;
  }

  const descriptionNode = showDescription && field.description && (
    <Markdown md={field.description} />
  );

  const deprecatedNode = field.deprecationReason != null && (
    <Callout type="warn" title={t('Deprecated')}>
      <Markdown md={field.deprecationReason} />
    </Callout>
  );

  const directives = getCustomDirectives(field.astNode);
  const directivesNode = directives.length > 0 && (
    <DirectiveList directives={directives} className="my-4" />
  );

  const example = useMemo(
    () => generateOperationExample(schema, { kind, name }),
    [schema, kind, name],
  );

  const playground = ctx.playground;
  let playgroundNode: ReactNode = null;
  if (playground && (playground.url != null || playground.fetcher || playground.render)) {
    playgroundNode = playground.render ? (
      playground.render({ kind, name, operation: field, ctx })
    ) : (
      <OperationPlayground kind={kind} field={field} example={example} />
    );
  }

  const argsNode = field.args.length > 0 && (
    <>
      <Heading id="arguments" depth={headingLevel} className="mt-10">
        {t('Arguments')}
      </Heading>
      <AnchorSection segments={['arguments']}>
        <div className="flex flex-col">
          {field.args.map((arg) => (
            <ctx.SchemaUI
              key={arg.name}
              client={{
                name: arg.name,
                required: isRequiredArgument(arg),
              }}
              root={{
                type: arg.type,
                description: arg.description,
                deprecationReason: arg.deprecationReason,
                default: arg.default,
                astNode: arg.astNode,
              }}
            />
          ))}
        </div>
      </AnchorSection>
    </>
  );

  const returnsNode = (
    <>
      <div className="flex flex-wrap gap-2 items-center justify-between mt-10 mb-4">
        <Heading id="returns" depth={headingLevel} className="my-0!">
          {t('Returns')}
        </Heading>
        <TypeAnnotation type={field.type} className="text-sm not-prose" />
      </div>
      <AnchorSection segments={['returns']}>
        <ctx.SchemaUI
          client={{
            name: 'returns',
            as: 'body',
          }}
          root={{
            type: field.type,
          }}
        />
      </AnchorSection>
    </>
  );

  const snippets = useMemo(
    () =>
      example
        ? generateRequestSnippets({
            url: playground?.url,
            query: example.query,
            variables: example.variables,
          })
        : [],
    [example, playground?.url],
  );
  let exampleNode: ReactNode = null;
  if (example) {
    const snippetLabels: Record<'curl' | 'js', string> = {
      curl: t('cURL'),
      js: t('JavaScript'),
    };
    const items = [t('Query'), ...snippets.map((snippet) => snippetLabels[snippet.id])];
    if (example.variables !== undefined) items.push(t('Variables'));
    items.push(t('Response'));

    exampleNode = (
      <Tabs items={items} className="not-prose my-0 shadow-sm">
        <Tab value={t('Query')}>
          <ClientCodeBlock lang="graphql" code={example.query} />
        </Tab>
        {snippets.map((snippet) => (
          <Tab key={snippet.id} value={snippetLabels[snippet.id]}>
            <ClientCodeBlock lang={snippet.lang} code={snippet.code} />
          </Tab>
        ))}
        {example.variables !== undefined && (
          <Tab value={t('Variables')}>
            <ClientCodeBlock lang="json" code={JSON.stringify(example.variables, null, 2)} />
          </Tab>
        )}
        <Tab value={t('Response')}>
          <ClientCodeBlock lang="json" code={JSON.stringify(example.response, null, 2)} />
        </Tab>
      </Tabs>
    );
  }

  let { renderOperationLayout } = ctx.content ?? {};

  renderOperationLayout ??= (slots) => {
    return (
      <div className="flex flex-col gap-x-6 gap-y-4 @4xl:flex-row @4xl:items-start">
        <div className="min-w-0 flex-1">
          {slots.header}
          {slots.playground}
          {slots.description}
          {slots.deprecated}
          {slots.directives}
          {slots.arguments}
          {slots.returns}
        </div>
        <div className="flex flex-col gap-4 mt-6 @4xl:mt-0 @4xl:sticky @4xl:top-[calc(var(--fd-docs-row-3,var(--fd-docs-row-2,0px))+1rem)] @4xl:w-[400px]">
          {slots.example}
        </div>
      </div>
    );
  };

  return renderOperationLayout(
    {
      header: headNode,
      description: descriptionNode,
      deprecated: deprecatedNode,
      directives: directivesNode,
      playground: playgroundNode,
      arguments: argsNode,
      returns: returnsNode,
      example: exampleNode,
    },
    {
      operation: field,
      kind,
      ctx,
    },
  );
}
