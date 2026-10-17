'use client';
import { Fragment, type ReactNode } from 'react';
import { Popover } from '@base-ui/react/popover';
import { useTranslations } from '@fuma-translate/react';
import {
  getNamedType,
  type GraphQLNamedType,
  type GraphQLType,
  isEnumType,
  isInputObjectType,
  isScalarType,
  isSpecifiedScalarType,
} from 'graphql';
import Link from 'fumadocs-core/link';
import { Badge } from 'shared-api/components/badge';
import { TypeProvider, useNamedType } from '@/type-docs';
import { useGraphQL, useTypeLink } from '@/utils/create-page';
import { cn } from '@/utils/cn';
import { getKindColor } from './badge';
import { chipClassName, detailsMarkdownClassName, popupClassName } from './chip';
import { Markdown } from './markdown';

/** a link to a reference, like the page of an operation */
export const linkClassName =
  'underline decoration-fd-muted-foreground/50 underline-offset-4 transition-colors hover:text-fd-accent-foreground hover:decoration-current';

// dotted like the types Schema UI opens
const triggerClassName =
  'underline decoration-dotted underline-offset-4 transition-colors hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring data-popup-open:text-fd-accent-foreground';

/**
 * A named type: a link to `href` where the type is explained, otherwise its hover card. Built-in scalars are plain text.
 */
export function TypeRef({ name, href }: { name: string; href?: string }) {
  const type = useGraphQL().schema.getType(name);
  if (href)
    return (
      <Link href={href} className={linkClassName}>
        {name}
      </Link>
    );
  if (!type || isSpecifiedScalarType(type)) return name;

  return (
    <Popover.Root>
      <Popover.Trigger openOnHover delay={200} closeDelay={100} className={triggerClassName}>
        {name}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup className={popupClassName}>
            <TypeProvider name={name}>
              <TypeCard />
            </TypeProvider>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** a named type linked to its page, or its hover card when it has none */
export function TypeLink({ name }: { name: string }) {
  return <TypeRef name={name} href={useTypeLink(name)} />;
}

/**
 * A type annotation like `[User!]!`, its named type links to `href` when set, otherwise has a hover card.
 */
export function TypeAnnotation({
  type,
  href,
  className,
}: {
  type: GraphQLType;
  href?: string;
  className?: string;
}) {
  const { name } = getNamedType(type);
  const annotation = String(type);
  const start = annotation.indexOf(name);

  return (
    <code className={cn('font-mono text-fd-muted-foreground', className)}>
      {annotation.slice(0, start)}
      <TypeRef name={name} href={href} />
      {annotation.slice(start + name.length)}
    </code>
  );
}

/**
 * The SDL head of the named type in context, like `type Customer implements Node`.
 *
 * `interactive` types link to their pages, or have hover cards without one.
 */
export function TypeHead({ interactive = false }: { interactive?: boolean }) {
  const { name, kind, type, relations } = useNamedType();

  return (
    <>
      <Badge color={getKindColor(kind)} className="text-xs">
        {kind === 'object' ? 'type' : kind}
      </Badge>
      <code className="min-w-0 wrap-break-word">
        {name}
        <TypeList
          keyword="implements"
          separator="&"
          types={relations.implements}
          interactive={interactive}
        />
        <TypeList
          keyword="="
          separator="|"
          types={relations.possibleTypes}
          interactive={interactive}
        />
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

/** the summary of the named type in context, its fields are left to Schema UI */
export function TypeCard() {
  const t = useTranslations({ note: 'type card' });
  const { type, relations } = useNamedType();
  let detail: ReactNode = null;

  if (relations.implementedBy.length > 0) {
    detail = <Detail label={t('Implemented by')}>{names(relations.implementedBy)}</Detail>;
  } else if (relations.unions.length > 0) {
    detail = <Detail label={t('Member of')}>{names(relations.unions)}</Detail>;
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
        <TypeHead />
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
