'use client';
import { type ReactNode, useMemo } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { AnchorSection } from '@fumadocs/api-docs/auto-anchor/client';
import {
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';
import { getCustomDirectives, getNamedTypeKind } from '@/utils/schema';
import { KindLabel } from '../components/badge';
import { Heading } from '../components/heading';
import { Markdown } from '../components/markdown';
import { EnumValueList } from '../components/enum-values';
import { DirectiveList, TypeAnnotation } from '../components/type-annotation';
import { useRenderContext } from '../contexts/api';
import { Layers } from 'lucide-react';

export function TypeDocs({
  name,
  showTitle,
  showDescription,
  headingLevel = 2,
}: {
  name: string;
  showTitle?: boolean;
  showDescription?: boolean;
  headingLevel?: number;
}) {
  const t = useTranslations({ note: 'type page' });
  const ctx = useRenderContext();
  const { schema } = ctx.schema;
  const type = useMemo(() => {
    const type = schema.getType(name);
    if (!type) throw new Error(`[Fumadocs GraphQL] Type not found in schema: ${name}`);

    return type;
  }, [schema, name]);
  const kind = getNamedTypeKind(type);

  let headNode: ReactNode = null;
  if (showTitle) {
    headNode = (
      <div className="flex gap-2 items-center justify-between">
        <Heading id={name} depth={headingLevel} className="my-0!">
          {name}
        </Heading>
        <KindLabel className="text-xs">{kind}</KindLabel>
      </div>
    );
    headingLevel++;
  }

  const descriptionNode = showDescription && type.description && <Markdown md={type.description} />;

  const directives = getCustomDirectives(type.astNode);
  const directivesNode = directives.length > 0 && <DirectiveList directives={directives} />;

  const relations: ReactNode[] = [];
  if ((isObjectType(type) || isInterfaceType(type)) && type.getInterfaces().length > 0) {
    relations.push(
      <TypeRelation
        key="implements"
        label={t('Implements')}
        types={type.getInterfaces().map((i) => i.name)}
      />,
    );
  }
  if (isInterfaceType(type)) {
    const { objects } = schema.getImplementations(type);
    if (objects.length > 0) {
      relations.push(
        <TypeRelation
          key="implemented-by"
          label={t('Implemented by')}
          types={objects.map((o) => o.name)}
        />,
      );
    }
  }
  if (isUnionType(type)) {
    relations.push(
      <TypeRelation
        key="possible-types"
        label={t('Possible types')}
        types={type.getTypes().map((o) => o.name)}
      />,
    );
  }
  const relationsNode: ReactNode = relations.length > 0 && (
    <div className="flex flex-col gap-2 mt-4">{relations}</div>
  );

  let fieldsNode: ReactNode = null;
  if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
    fieldsNode = (
      <>
        <Heading id="fields" depth={headingLevel} className="mt-10">
          {t('Fields')}
        </Heading>
        <AnchorSection segments={['fields']}>
          <ctx.SchemaUI
            client={{
              name: type.name,
              as: 'body',
            }}
            root={{
              type,
              // already displayed on the page
              description: '',
            }}
          />
        </AnchorSection>
      </>
    );
  } else if (isUnionType(type)) {
    fieldsNode = (
      <AnchorSection segments={['types']}>
        <ctx.SchemaUI
          client={{
            name: type.name,
            as: 'body',
          }}
          root={{
            type,
            // already displayed on the page
            description: '',
          }}
        />
      </AnchorSection>
    );
  }

  let valuesNode: ReactNode = null;
  if (isEnumType(type)) {
    valuesNode = (
      <>
        <Heading id="values" depth={headingLevel} className="mt-10">
          {t('Values')}
        </Heading>
        <EnumValueList
          type={type}
          className="p-2 bg-fd-card text-fd-card-foreground border rounded-lg shadow-md"
        />
      </>
    );
  }

  let scalarNode: ReactNode = null;
  if (isScalarType(type) && type.specifiedByURL) {
    scalarNode = (
      <p className="text-sm not-prose">
        {t('Specification')}:{' '}
        <a
          href={type.specifiedByURL}
          rel="noreferrer noopener"
          className="underline text-fd-muted-foreground hover:text-fd-accent-foreground"
        >
          {type.specifiedByURL}
        </a>
      </p>
    );
  }

  let { renderTypeLayout } = ctx.content ?? {};

  renderTypeLayout ??= (slots) => {
    return (
      <div className="prose-no-margin">
        {slots.header}
        {slots.description}
        {slots.directives}
        {slots.relations}
        {slots.fields}
        {slots.values}
        {slots.scalar}
      </div>
    );
  };

  return renderTypeLayout(
    {
      header: headNode,
      description: descriptionNode,
      directives: directivesNode,
      relations: relationsNode,
      fields: fieldsNode,
      values: valuesNode,
      scalar: scalarNode,
    },
    {
      type,
      kind,
      ctx,
    },
  );
}

function TypeRelation({ label, types }: { label: ReactNode; types: string[] }) {
  const { schema } = useRenderContext().schema;

  return (
    <div className="grid grid-cols-[auto_1fr] not-prose bg-fd-card text-sm text-fd-card-foreground rounded-lg border shadow-md overflow-hidden">
      <p className="flex items-center gap-1.5 font-medium border-e bg-fd-secondary text-fd-secondary-foreground p-2">
        <Layers className="text-fd-primary size-3.5" />
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-4 p-2">
        {types.map((name) => {
          const type = schema.getType(name);
          if (type) return <TypeAnnotation key={name} type={type} />;
          return <code key={name}>{name}</code>;
        })}
      </div>
    </div>
  );
}
