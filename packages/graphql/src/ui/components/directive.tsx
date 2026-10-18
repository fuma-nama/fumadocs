'use client';
import { Fragment } from 'react';
import { type DirectiveNode, print } from 'graphql';
import { useTranslations } from '@fuma-translate/react';
import { useGraphQL } from '@/utils/create-page';
import { printDefaultValue } from '@/utils/sdl';
import { cn } from '@/utils/cn';
import { Markdown } from './markdown';
import { chipClassName, DetailsPopover, detailsMarkdownClassName } from './chip';

/** applied directives like `@auth(requires: USER)`, a chip opens the definition of its directive */
export function Directives({
  directives,
  className,
}: {
  directives: readonly DirectiveNode[];
  className?: string;
}) {
  return (
    <div className={cn('not-prose flex flex-wrap gap-1.5', className)}>
      {directives.map((directive, i) => (
        <Directive key={i} node={directive} />
      ))}
    </div>
  );
}

/** the directives applied to an operation or type, a row of its bar */
export function DirectiveRow({ directives }: { directives: readonly DirectiveNode[] }) {
  const t = useTranslations({ note: 'graphql schema ui' });
  if (directives.length === 0) return null;

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 border-t py-1.5 ps-3.5 pe-1.5">
      <span className="me-0.5 text-xs text-fd-muted-foreground">{t('Directives')}</span>
      <Directives directives={directives} className="contents" />
    </div>
  );
}

function Directive({ node }: { node: DirectiveNode }) {
  const name = node.name.value;
  const definition = useGraphQL().schema.getDirective(name);
  const label = (
    <>
      {`@${name}`}
      <span className="text-fd-muted-foreground">{print(node).slice(name.length + 1)}</span>
    </>
  );
  if (!definition || (!definition.description && definition.args.length === 0))
    return <code className={chipClassName}>{label}</code>;

  return (
    <DetailsPopover
      details={
        <>
          <p className="font-mono text-[0.8125rem]">
            <span className="font-medium">{`@${name}`}</span>
            <span className="text-xs text-fd-muted-foreground">
              {` on ${definition.locations.join(' | ')}`}
            </span>
          </p>
          {definition.description && (
            <div className={cn('mt-1.5', detailsMarkdownClassName)}>
              <Markdown md={definition.description} />
            </div>
          )}
          {definition.args.length > 0 && (
            <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t pt-2.5 text-xs">
              {definition.args.map((arg) => {
                const value = printDefaultValue(arg.default, arg.type);

                return (
                  <Fragment key={arg.name}>
                    <dt className="font-mono">{arg.name}</dt>
                    <dd className="min-w-0">
                      <code className="text-fd-muted-foreground">
                        {value === undefined ? String(arg.type) : `${arg.type} = ${value}`}
                      </code>
                      {arg.description && (
                        <div className={cn('mt-0.5', detailsMarkdownClassName)}>
                          <Markdown md={arg.description} />
                        </div>
                      )}
                    </dd>
                  </Fragment>
                );
              })}
            </dl>
          )}
        </>
      }
    >
      {label}
    </DetailsPopover>
  );
}

/** `@deprecated` on enum values, like the label of Schema UI */
export function DeprecatedLabel() {
  const t = useTranslations({ note: 'graphql schema ui' });

  return (
    <span className="shrink-0 font-mono text-xs text-yellow-600 dark:text-yellow-400">
      {t('Deprecated')}
    </span>
  );
}

/** the reason of `@deprecated` in the tone of its label, like the Schema UI rows */
export function DeprecationReason({ reason, className }: { reason: string; className?: string }) {
  return (
    <div className={cn('prose-no-margin text-yellow-700 dark:text-yellow-400', className)}>
      <Markdown md={reason} />
    </div>
  );
}
