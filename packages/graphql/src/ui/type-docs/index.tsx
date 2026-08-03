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
import { getCustomDirectives, getNamedTypeKind, type OperationKind } from '@/utils/schema';
import { getTypeUsages } from '@/utils/usage';
import { KindLabel } from '../components/badge';
import { Heading } from '../components/heading';
import { Markdown } from '../components/markdown';
import { EnumValueList } from '../components/enum-values';
import { DirectiveList, ReferenceLink, TypeAnnotation } from '../components/type-annotation';
import { resolveOperationLink, resolveTypeLink, useRenderContext } from '../contexts/api';
import { Braces, CornerUpLeft, Import, Layers, Variable } from 'lucide-react';
import Link from 'fumadocs-core/link';

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
      <TypeRelation key="implements" label={t('Implements')}>
        {type.getInterfaces().map((i) => (
          <TypeAnnotation key={i.name} type={i} />
        ))}
      </TypeRelation>,
    );
  }
  if (isInterfaceType(type)) {
    const { objects } = schema.getImplementations(type);
    if (objects.length > 0) {
      relations.push(
        <TypeRelation key="implemented-by" label={t('Implemented by')}>
          {objects.map((o) => (
            <TypeAnnotation key={o.name} type={o} />
          ))}
        </TypeRelation>,
      );
    }
  }
  if (isUnionType(type)) {
    relations.push(
      <TypeRelation key="possible-types" label={t('Possible types')}>
        {type.getTypes().map((o) => (
          <TypeAnnotation key={o.name} type={o} />
        ))}
      </TypeRelation>,
    );
  }
  const usages = useMemo(() => getTypeUsages(schema, name), [schema, name]);
  if (usages.returnedBy.length > 0) {
    relations.push(
      <TypeRelation key="returned-by" label={t('Returned by')} icon={CornerUpLeft}>
        {usages.returnedBy.map((op) => (
          <OperationChip key={`${op.kind}:${op.name}`} kind={op.kind} name={op.name} />
        ))}
      </TypeRelation>,
    );
  }
  if (usages.inputFor.length > 0) {
    relations.push(
      <TypeRelation key="input-for" label={t('Input for')} icon={Import}>
        {usages.inputFor.map((op) => (
          <OperationChip key={`${op.kind}:${op.name}`} kind={op.kind} name={op.name} />
        ))}
      </TypeRelation>,
    );
  }
  if (usages.memberOf.length > 0) {
    relations.push(
      <TypeRelation key="field-of" label={t('Field of')} icon={Braces}>
        {usages.memberOf.map((ref) => (
          <FieldChip key={`${ref.parent}.${ref.field}`} parent={ref.parent} field={ref.field} />
        ))}
      </TypeRelation>,
    );
  }
  if (usages.argumentOf.length > 0) {
    relations.push(
      <TypeRelation key="argument-of" label={t('Argument of')} icon={Variable}>
        {usages.argumentOf.map((ref) => (
          <FieldChip key={`${ref.parent}.${ref.field}`} parent={ref.parent} field={ref.field} />
        ))}
      </TypeRelation>,
    );
  }

  const relationsNode: ReactNode = relations.length > 0 && (
    <TypeRelations>{relations}</TypeRelations>
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
      <p className="text-sm">
        {t('Specification')}:{' '}
        <a
          href={type.specifiedByURL}
          rel="noreferrer noopener"
          className="not-prose underline text-fd-muted-foreground hover:text-fd-accent-foreground"
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

  const slots = {
    header: headNode,
    description: descriptionNode,
    directives: directivesNode,
    relations: relationsNode,
    fields: fieldsNode,
    values: valuesNode,
    scalar: scalarNode,
  };

  return renderTypeLayout(slots, {
    type,
    kind,
    ctx,
  });
}

function TypeRelations({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] not-prose bg-fd-card text-sm text-fd-card-foreground rounded-lg border shadow-md overflow-hidden my-4">
      {children}
    </div>
  );
}

function TypeRelation({
  label,
  icon: Icon = Layers,
  children,
}: {
  label: ReactNode;
  icon?: typeof Layers;
  children: ReactNode;
}) {
  return (
    <>
      <div className="size-full font-medium border-e bg-fd-secondary text-fd-secondary-foreground p-2 border-b last:border-b-none">
        <p className="flex items-center gap-1.5">
          <Icon className="text-fd-primary size-3.5" />
          {label}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4 p-2">{children}</div>
    </>
  );
}

function OperationChip({ kind, name }: { kind: OperationKind; name: string }) {
  const ctx = useRenderContext();
  const href = resolveOperationLink(ctx, kind, name);

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center font-mono gap-1.5 transition-opacity hover:opacity-80"
      >
        <KindLabel className="text-xs p-0.5 bg-fd-secondary rounded-md border shadow-sm">
          {kind}
        </KindLabel>
        {name}
      </Link>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-fd-muted-foreground font-mono">
      <KindLabel className="text-xs p-0.5 bg-fd-secondary rounded-md border shadow-sm">
        {kind}
      </KindLabel>
      {name}
    </span>
  );
}

function FieldChip({ parent, field }: { parent: string; field: string }) {
  const ctx = useRenderContext();
  const href = resolveTypeLink(ctx, parent);

  return (
    <code className="font-mono text-fd-muted-foreground">
      {href ? <ReferenceLink href={href}>{parent}</ReferenceLink> : parent}
      {`.${field}`}
    </code>
  );
}
