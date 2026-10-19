'use client';
import { Fragment } from 'react';
import {
  getNamedType,
  type GraphQLNamedType,
  type GraphQLType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isUnionType,
} from 'graphql';
import Link from 'fumadocs-core/link';
import { Badge } from 'shared-api/components/badge';
import { useTypeLink } from '@/utils/create-page';
import { getNamedTypeKind } from '@/utils/schema';
import { getKindColor } from './badge';

/** a link to a reference, like the page of an operation */
export const linkClassName =
  'underline decoration-fd-muted-foreground/50 underline-offset-4 transition-colors hover:text-fd-accent-foreground hover:decoration-current';

/** a named type linked to its page, plain text without one */
export function TypeLink({ name }: { name: string }) {
  const href = useTypeLink(name);
  if (!href) return name;

  return (
    <Link href={href} className={linkClassName}>
      {name}
    </Link>
  );
}

/**
 * A type annotation like `[User!]!`, its named type links to `href` where the type is explained.
 */
export function TypeAnnotation({ type, href }: { type: GraphQLType; href: string }) {
  const { name } = getNamedType(type);
  const annotation = String(type);
  const start = annotation.indexOf(name);

  return (
    <code className="font-mono text-fd-muted-foreground">
      {annotation.slice(0, start)}
      <a href={href} className={linkClassName}>
        {name}
      </a>
      {annotation.slice(start + name.length)}
    </code>
  );
}

/**
 * The SDL head of a named type, like `type Customer implements Node`, other types link to their pages.
 */
export function TypeHead({ type }: { type: GraphQLNamedType }) {
  const kind = getNamedTypeKind(type);

  return (
    <>
      <Badge color={getKindColor(kind)} className="text-xs">
        {kind === 'object' ? 'type' : kind}
      </Badge>
      <code className="min-w-0 wrap-break-word">
        {type.name}
        {(isObjectType(type) || isInterfaceType(type)) && (
          <TypeList keyword="implements" separator="&" types={type.getInterfaces()} />
        )}
        {isUnionType(type) && <TypeList keyword="=" separator="|" types={type.getTypes()} />}
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
}: {
  keyword: string;
  separator: string;
  types: readonly GraphQLNamedType[];
}) {
  if (types.length === 0) return null;

  return (
    <span className="text-fd-muted-foreground">
      {` ${keyword} `}
      {types.map((item, i) => (
        <Fragment key={item.name}>
          {i > 0 && ` ${separator} `}
          <TypeLink name={item.name} />
        </Fragment>
      ))}
    </span>
  );
}
