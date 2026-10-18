'use client';
import { type ReactNode, useMemo } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { getNamedType, isLeafType, isNonNullType } from 'graphql';
import { AnchorSection } from 'shared-api/auto-anchor';
import { Badge } from 'shared-api/components/badge';
import { Callout } from 'fumadocs-ui/components/callout';
import { type SchemaViewRoot, useGraphQL, useRenderContext } from '@/utils/create-page';
import { OperationProvider, type PageOperationProps, useOperation } from '@/operation';
import { SchemaUI } from '@/ui/components/schema';
import { OperationPlayground } from '@/ui/playground';
import { Heading } from '../components/heading';
import { Markdown } from '../components/markdown';
import { SectionHeader } from '../components/section';
import { OperationBar } from './bar';
import { OperationExamples } from './examples';

export function Operation({ kind, name, ...props }: PageOperationProps) {
  return (
    <OperationProvider kind={kind} name={name}>
      <OperationContent {...props} />
    </OperationProvider>
  );
}

function OperationContent({
  showTitle,
  showDescription,
}: Omit<PageOperationProps, 'kind' | 'name'>) {
  const t = useTranslations({ note: 'operation page' });
  const ctx = useRenderContext();
  const { schema } = useGraphQL();
  const { kind, name, title, field } = useOperation();
  const { deprecationReason } = field;
  const returns = useMemo<SchemaViewRoot>(() => ({ type: field.type }), [field]);
  const headingLevel = showTitle ? 3 : 2;

  let playground: ReactNode;
  if (ctx.playground?.render) {
    playground = ctx.playground.render({ kind, name, operation: field, ctx });
  } else if (ctx.playground && (ctx.playground.url != null || ctx.playground.fetcher)) {
    playground = <OperationPlayground />;
  } else {
    playground = <OperationBar />;
  }

  const slots = {
    header: showTitle ? (
      <div className="mb-4 flex items-center justify-between gap-2">
        {/* the anchor of operation itself */}
        <Heading id="" depth={2} className="my-0!">
          {title}
        </Heading>
        {deprecationReason != null && (
          <Badge color="yellow" className="text-xs not-prose">
            {t('Deprecated')}
          </Badge>
        )}
      </div>
    ) : null,
    description:
      showDescription && field.description ? (
        <div className="prose-no-margin">
          <Markdown md={field.description} />
        </div>
      ) : null,
    deprecated:
      deprecationReason != null ? (
        // the title already says it with the badge
        <Callout type="warn" title={showTitle ? undefined : t('Deprecated')} className="mt-0!">
          <Markdown md={deprecationReason} />
        </Callout>
      ) : null,
    playground,
    arguments:
      field.args.length > 0 ? (
        <>
          <SectionHeader id="arguments" depth={headingLevel} title={t('Arguments')} />
          {/* the signature bar links to its rows */}
          <AnchorSection segments={['arguments']}>
            <SchemaUI
              client={{ name: 'arguments', as: 'body' }}
              root={`${schema.getRootType(kind)!.name}.${name}()`}
            />
          </AnchorSection>
        </>
      ) : null,
    returns: (
      <>
        <SectionHeader id="returns" depth={headingLevel} title={t('Returns')} />
        <AnchorSection segments={['returns']}>
          {isLeafType(getNamedType(field.type)) ? (
            <div className="rounded-xl border bg-fd-card px-3">
              <SchemaUI
                client={{ name: field.name, required: isNonNullType(field.type) }}
                root={returns}
              />
            </div>
          ) : (
            <SchemaUI client={{ name: field.name, as: 'body' }} root={returns} />
          )}
        </AnchorSection>
      </>
    ),
    example: <OperationExamples />,
  };

  let content: ReactNode;
  if (ctx.content?.renderOperationLayout) {
    content = ctx.content.renderOperationLayout(slots, { operation: field, kind, ctx });
  } else {
    content = (
      <div className="flex flex-col gap-x-6 gap-y-4 @4xl:flex-row @4xl:items-start">
        <div className="min-w-0 flex-1">
          {slots.header}
          {slots.deprecated}
          {slots.playground}
          <div className="my-6 empty:hidden">{slots.description}</div>
          {slots.arguments}
          {slots.returns}
        </div>
        {/* empty when the operation has no example */}
        <div className="empty:hidden @4xl:sticky @4xl:top-[calc(var(--fd-docs-row-3,0px)+1rem)] @4xl:flex @4xl:max-h-[calc(var(--fd-docs-height,100dvh)-var(--fd-docs-row-3,0px)-2rem)] @4xl:w-[400px] @4xl:flex-col">
          {slots.example}
        </div>
      </div>
    );
  }

  // ids of sections are unique when a page has several items
  if (showTitle) return <AnchorSection segments={[title]}>{content}</AnchorSection>;
  return content;
}
