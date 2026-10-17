'use client';
import { Fragment } from 'react';
import { type DirectiveNode, print } from 'graphql';
import { useGraphQL } from '@/utils/create-page';
import { printDefaultValue } from '@/utils/sdl';
import { cn } from '@/utils/cn';
import { Markdown } from './markdown';
import { chipClassName, ChipPopover, detailsMarkdownClassName } from './chip';

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
    <ChipPopover
      details={
        <>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-mono text-[0.8125rem] font-medium">{`@${name}`}</span>
            <span className="ms-auto font-mono text-xs text-fd-muted-foreground">
              {definition.locations.join(' | ')}
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
    </ChipPopover>
  );
}
