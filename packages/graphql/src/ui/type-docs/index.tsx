'use client';
import { type ReactNode, useMemo } from 'react';
import { useTranslations } from '@fuma-translate/react';
import {
  type GraphQLEnumType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isUnionType,
} from 'graphql';
import Link from 'fumadocs-core/link';
import { AnchorSection } from 'shared-api/auto-anchor';
import { cardCodeBlock, exampleCardClassName, ExampleHeader } from 'shared-api/components/example';
import {
  type SchemaViewRoot,
  useGraphQL,
  useOperationLink,
  useRenderContext,
} from '@/utils/create-page';
import { type PageTypeProps, TypeProvider, useNamedType } from '@/type-docs';
import { type FieldRef, getCustomDirectives, type OperationRef } from '@/utils/schema';
import { printDefinition } from '@/utils/sdl';
import { cn } from '@/utils/cn';
import { SchemaUI } from '@/ui/components/schema';
import { KindLabel } from '../components/badge';
import { ClientCodeBlock } from '../components/codeblock';
import { Directives } from '../components/directive';
import { Heading } from '../components/heading';
import { Markdown } from '../components/markdown';
import { SectionHeader } from '../components/section';
import { linkClassName, TypeLink } from '../components/type-annotation';
import { TypeDefinition } from './definition';

export function TypeDocs({ name, ...props }: PageTypeProps) {
  return (
    <TypeProvider name={name}>
      <TypeDocsContent {...props} />
    </TypeProvider>
  );
}

function TypeDocsContent({ showTitle, showDescription }: Omit<PageTypeProps, 'name'>) {
  const t = useTranslations({ note: 'type page' });
  const ctx = useRenderContext();
  const { name, kind, type, directives } = useNamedType();
  // the page documents the type, the Schema UI lists its fields
  const root = useMemo<SchemaViewRoot>(() => ({ type, description: '' }), [type]);
  const headingLevel = showTitle ? 3 : 2;

  let fields: ReactNode = null;
  if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type) || isUnionType(type)) {
    const union = isUnionType(type);
    const id = union ? 'possible-types' : 'fields';

    fields = (
      <>
        <SectionHeader
          id={id}
          depth={headingLevel}
          title={union ? t('Possible Types') : t('Fields')}
        />
        {isInputObjectType(type) && type.isOneOf && (
          <p className="not-prose mb-3 text-fd-muted-foreground">
            {t('Exactly one field must be set.')}
          </p>
        )}
        <AnchorSection segments={[id]}>
          <SchemaUI client={{ name, as: 'body' }} root={root} />
        </AnchorSection>
      </>
    );
  }

  const slots = {
    header: showTitle ? (
      // the anchor of type itself
      <Heading id="" depth={2} className="mt-0! mb-4">
        {name}
      </Heading>
    ) : null,
    definition: <TypeDefinition />,
    description:
      showDescription && type.description ? (
        <div className="prose-no-margin">
          <Markdown md={type.description} />
        </div>
      ) : null,
    directives: directives.length > 0 ? <Directives directives={directives} /> : null,
    fields,
    values: isEnumType(type) ? <EnumValues type={type} headingLevel={headingLevel} /> : null,
    usages: <Usages headingLevel={headingLevel} />,
    sdl: (
      <div className={exampleCardClassName}>
        <ExampleHeader title="SDL" />
        <ClientCodeBlock lang="graphql" code={printDefinition(type)} codeblock={cardCodeBlock} />
      </div>
    ),
  };

  let content: ReactNode;
  if (ctx.content?.renderTypeLayout) {
    content = ctx.content.renderTypeLayout(slots, { type, kind, ctx });
  } else {
    content = (
      <div className="flex flex-col gap-x-6 gap-y-4 @4xl:flex-row @4xl:items-start">
        <div className="min-w-0 flex-1">
          {slots.header}
          {slots.definition}
          <div className="my-6 flex flex-col gap-3 empty:hidden">
            {slots.description}
            {slots.directives}
          </div>
          {slots.fields}
          {slots.values}
          {slots.usages}
        </div>
        <div className="@4xl:sticky @4xl:top-[calc(var(--fd-docs-row-3,0px)+1rem)] @4xl:flex @4xl:max-h-[calc(var(--fd-docs-height,100dvh)-var(--fd-docs-row-3,0px)-2rem)] @4xl:w-[400px] @4xl:flex-col">
          {slots.sdl}
        </div>
      </div>
    );
  }

  // ids of sections are unique when a page has several items
  if (showTitle) return <AnchorSection segments={[name]}>{content}</AnchorSection>;
  return content;
}

function EnumValues({ type, headingLevel }: { type: GraphQLEnumType; headingLevel: number }) {
  const t = useTranslations({ note: 'type page' });

  return (
    <>
      <SectionHeader id="values" depth={headingLevel} title={t('Values')} />
      <div className="rounded-xl border bg-fd-card px-3">
        {type.getValues().map((value) => {
          const { deprecationReason } = value;
          const directives = getCustomDirectives(value.astNode);

          return (
            <div key={value.name} className="border-t py-2.5 first:border-t-0">
              <div className="not-prose flex flex-wrap items-center gap-x-2 gap-y-1">
                <code
                  className={cn(
                    'text-[0.8125rem] font-medium text-fd-primary',
                    deprecationReason != null && 'line-through opacity-80',
                  )}
                >
                  {value.name}
                </code>
                {deprecationReason != null && (
                  <span className="font-mono text-xs text-yellow-600 dark:text-yellow-400">
                    {t('Deprecated')}
                  </span>
                )}
              </div>
              {(value.description || deprecationReason || directives.length > 0) && (
                <div className="mt-1 flex flex-col gap-2 text-fd-muted-foreground">
                  {value.description && (
                    <div className="prose-no-margin">
                      <Markdown md={value.description} />
                    </div>
                  )}
                  {deprecationReason && (
                    <div className="prose-no-margin">
                      <Markdown md={deprecationReason} />
                    </div>
                  )}
                  {directives.length > 0 && <Directives directives={directives} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** where the type is used, and the implementations of interfaces */
function Usages({ headingLevel }: { headingLevel: number }) {
  const t = useTranslations({ note: 'type page' });
  const { implementedBy, unions, usages } = useNamedType().relations;
  const { returnedBy, inputFor, memberOf, argumentOf } = usages;
  if (
    implementedBy.length === 0 &&
    unions.length === 0 &&
    returnedBy.length === 0 &&
    inputFor.length === 0 &&
    memberOf.length === 0 &&
    argumentOf.length === 0
  )
    return null;

  return (
    <>
      <SectionHeader id="usages" depth={headingLevel} title={t('Usages')} />
      <dl className="not-prose rounded-xl border bg-fd-card px-3 text-[0.8125rem]">
        {implementedBy.length > 0 && (
          <Usage label={t('Implemented by')}>
            {implementedBy.map((item) => (
              <code key={item.name}>
                <TypeLink name={item.name} />
              </code>
            ))}
          </Usage>
        )}
        {unions.length > 0 && (
          <Usage label={t('Member of')}>
            {unions.map((item) => (
              <code key={item.name}>
                <TypeLink name={item.name} />
              </code>
            ))}
          </Usage>
        )}
        {returnedBy.length > 0 && (
          <Usage label={t('Returned by')}>
            {returnedBy.map((item) => (
              <OperationUsage key={`${item.kind}:${item.name}`} item={item} />
            ))}
          </Usage>
        )}
        {inputFor.length > 0 && (
          <Usage label={t('Input for')}>
            {inputFor.map((item) => (
              <OperationUsage key={`${item.kind}:${item.name}`} item={item} />
            ))}
          </Usage>
        )}
        {memberOf.length > 0 && (
          <Usage label={t('Field of')}>
            {memberOf.map((item) => (
              <FieldUsage key={`${item.parent}.${item.field}`} item={item} />
            ))}
          </Usage>
        )}
        {argumentOf.length > 0 && (
          <Usage label={t('Argument of')}>
            {argumentOf.map((item) => (
              <FieldUsage key={`${item.parent}.${item.field}`} item={item} />
            ))}
          </Usage>
        )}
      </dl>
    </>
  );
}

function Usage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-t py-2.5 first:border-t-0 @sm:grid-cols-[8rem_minmax(0,1fr)] @sm:gap-3">
      <dt className="text-fd-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">{children}</dd>
    </div>
  );
}

function OperationUsage({ item }: { item: OperationRef }) {
  const href = useOperationLink(item.kind, item.name);
  const field = useGraphQL().schema.getRootType(item.kind)?.getFields()[item.name];

  return (
    <span className="inline-flex items-baseline gap-1.5">
      <KindLabel className="text-xs">{item.kind}</KindLabel>
      <code className={field?.deprecationReason != null ? 'line-through' : undefined}>
        {href ? (
          <Link href={href} className={linkClassName}>
            {item.name}
          </Link>
        ) : (
          item.name
        )}
      </code>
    </span>
  );
}

function FieldUsage({ item }: { item: FieldRef }) {
  const parent = useGraphQL().schema.getType(item.parent);
  const field =
    isObjectType(parent) || isInterfaceType(parent) || isInputObjectType(parent)
      ? parent.getFields()[item.field]
      : undefined;

  return (
    <code className={field?.deprecationReason != null ? 'line-through' : undefined}>
      <TypeLink name={item.parent} />.{item.field}
    </code>
  );
}
