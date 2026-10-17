'use client';
import { Fragment, type ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import {
  getNamedType,
  type GraphQLNamedType,
  type GraphQLType,
  type GraphQLUnionType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isSpecifiedScalarType,
  isUnionType,
} from 'graphql';
import Link from 'fumadocs-core/link';
import { Badge } from 'shared-api/components/badge';
import { useGraphQL, useTypeLink } from '@/utils/create-page';
import { getNamedTypeKind } from '@/utils/schema';
import { cn } from '@/utils/cn';
import { getKindColor } from './badge';
import { chipClassName, DetailsPopover, detailsMarkdownClassName } from './chip';
import { Markdown } from './markdown';

/** a link to a reference, like the page of an operation */
export const linkClassName =
  'underline decoration-fd-muted-foreground/50 underline-offset-4 transition-colors hover:text-fd-accent-foreground hover:decoration-current';

/**
 * A named type: a link to `href` where the type is explained, otherwise its hover card. Built-in scalars are plain text.
 */
function TypeRef({ name, href }: { name: string; href?: string }) {
  const type = useGraphQL().schema.getType(name);
  if (href)
    return (
      <Link href={href} className={linkClassName}>
        {name}
      </Link>
    );
  if (!type || isSpecifiedScalarType(type)) return name;

  return <DetailsPopover details={<TypeCard type={type} />}>{name}</DetailsPopover>;
}

/** a named type linked to its page, or its hover card when it has none */
export function TypeLink({ name }: { name: string }) {
  return <TypeRef name={name} href={useTypeLink(name)} />;
}

/**
 * A type annotation like `[User!]!`, its named type links to `href` when set, otherwise has a hover card.
 */
export function TypeAnnotation({ type, href }: { type: GraphQLType; href?: string }) {
  const { name } = getNamedType(type);
  const annotation = String(type);
  const start = annotation.indexOf(name);

  return (
    <code className="font-mono text-fd-muted-foreground">
      {annotation.slice(0, start)}
      <TypeRef name={name} href={href} />
      {annotation.slice(start + name.length)}
    </code>
  );
}

/**
 * The SDL head of a named type, like `type Customer implements Node`.
 *
 * `interactive` types link to their pages, or have hover cards without one.
 */
export function TypeHead({
  type,
  interactive = false,
}: {
  type: GraphQLNamedType;
  interactive?: boolean;
}) {
  const kind = getNamedTypeKind(type);

  return (
    <>
      <Badge color={getKindColor(kind)} className="text-xs">
        {kind === 'object' ? 'type' : kind}
      </Badge>
      <code className="min-w-0 wrap-break-word">
        {type.name}
        {(isObjectType(type) || isInterfaceType(type)) && (
          <TypeList
            keyword="implements"
            separator="&"
            types={type.getInterfaces()}
            interactive={interactive}
          />
        )}
        {isUnionType(type) && (
          <TypeList keyword="=" separator="|" types={type.getTypes()} interactive={interactive} />
        )}
        {isInputObjectType(type) && type.isOneOf && (
          <span className="text-fd-muted-foreground"> @oneOf</span>
        )}
      </code>
    </>
  );
}

function TypeList({
  keyword,
  separator,
  types,
  interactive,
}: {
  keyword: string;
  separator: string;
  types: readonly GraphQLNamedType[];
  interactive: boolean;
}) {
  if (types.length === 0) return null;

  return (
    <span className="text-fd-muted-foreground">
      {` ${keyword} `}
      {types.map((item, i) => (
        <Fragment key={item.name}>
          {i > 0 && ` ${separator} `}
          {interactive ? <TypeLink name={item.name} /> : item.name}
        </Fragment>
      ))}
    </span>
  );
}

/** the summary of a named type, its fields are left to Schema UI */
export function TypeCard({ type }: { type: GraphQLNamedType }) {
  const t = useTranslations({ note: 'type card' });
  const { schema } = useGraphQL();
  let detail: ReactNode = null;

  if (isInterfaceType(type)) {
    const { objects } = schema.getImplementations(type);
    if (objects.length > 0) detail = <Detail label={t('Implemented by')}>{names(objects)}</Detail>;
  } else if (isObjectType(type)) {
    const unions: GraphQLUnionType[] = [];
    for (const item of Object.values(schema.getTypeMap())) {
      if (isUnionType(item) && item.getTypes().includes(type)) unions.push(item);
    }
    if (unions.length > 0) detail = <Detail label={t('Member of')}>{names(unions)}</Detail>;
  } else if (isEnumType(type)) {
    detail = (
      <Detail label={t('Values')}>
        <span className="flex flex-wrap gap-1">
          {type.getValues().map((value) => (
            <code
              key={value.name}
              title={value.description ?? undefined}
              className={cn(chipClassName, value.deprecationReason != null && 'line-through')}
            >
              {value.name}
            </code>
          ))}
        </span>
      </Detail>
    );
  } else if (isScalarType(type) && type.specifiedByURL) {
    detail = (
      <Detail label={t('Specification')}>
        <a
          href={type.specifiedByURL}
          target="_blank"
          rel="noreferrer noopener"
          title={type.specifiedByURL}
          className={cn('block truncate', linkClassName)}
        >
          {type.specifiedByURL}
        </a>
      </Detail>
    );
  } else if (isInputObjectType(type) && type.isOneOf) {
    detail = <p className="text-fd-muted-foreground">{t('Exactly one field must be set.')}</p>;
  }

  return (
    <>
      <p className="flex items-baseline gap-2 text-[0.8125rem]">
        <TypeHead type={type} />
      </p>
      {type.description && (
        <div className={cn('mt-1.5', detailsMarkdownClassName)}>
          <Markdown md={type.description} />
        </div>
      )}
      {detail && <div className="mt-2.5 border-t pt-2.5 text-xs">{detail}</div>}
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="shrink-0 text-fd-muted-foreground">{label}</span>
      <div className="min-w-0 font-mono">{children}</div>
    </div>
  );
}

function names(types: readonly GraphQLNamedType[]): string {
  let out = '';
  for (const item of types) out += `${out && ', '}${item.name}`;
  return out;
}
