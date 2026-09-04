import type { ComponentProps, ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { highlight } from 'fumadocs-core/highlight';
import { badgeVariants } from '../badge';

const cardVariants = cva('bg-fd-card rounded-lg text-sm my-6 p-3 border');

export function PyFunction(props: {
  name: string;
  type: string;
  kind?: 'func' | 'constructor';
  children?: ReactNode;
}) {
  return (
    <figure className={cn(cardVariants())}>
      <div className="flex gap-2 items-center font-mono flex-wrap mb-4">
        <code className={cn(badgeVariants({ color: 'func' }))}>{props.kind ?? 'func'}</code>
        {props.name}
        <InlineCode
          lang="python"
          className="not-prose text-xs text-fd-muted-foreground"
          code={props.type}
        />
      </div>
      <div className="text-fd-muted-foreground prose-no-margin">{props.children}</div>
    </figure>
  );
}

export function PyAttributes({ children }: { children?: ReactNode }) {
  return <figure className={cn(cardVariants(), 'p-0 divide-y')}>{children}</figure>;
}

export function PyAttribute(props: {
  name: string;
  type?: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="p-3">
      <div className="flex gap-2 items-center flex-wrap font-mono">
        <code className={cn(badgeVariants({ color: 'attribute' }))}>attribute</code>
        {props.name}
        {props.type && (
          <InlineCode
            lang="python"
            className="not-prose text-fd-muted-foreground text-xs"
            code={props.type}
          />
        )}
      </div>
      <div className="text-fd-muted-foreground prose-no-margin mt-2 empty:hidden">
        {props.value && (
          <InlineCode lang="python" className="not-prose text-xs" code={`= ${props.value}`} />
        )}
        {props.children}
      </div>
    </div>
  );
}

export function PyParameter(props: {
  name: string;
  type?: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div
      data-parameter=""
      className="bg-fd-secondary rounded-lg text-sm p-3 border shadow-md rounded-none first:rounded-t-lg last:rounded-b-lg"
    >
      <div className="flex flex-wrap gap-2 items-center font-mono text-fd-foreground">
        <code className={cn(badgeVariants({ color: 'primary' }))}>param</code>
        {props.name}
        {props.type && (
          <InlineCode
            lang="python"
            className="ms-auto text-fd-muted-foreground not-prose text-xs"
            code={props.type}
          />
        )}
      </div>
      <div className="text-fd-muted-foreground prose-no-margin mt-4 empty:hidden">
        {props.value ? (
          <InlineCode lang="python" code={`= ${props.value}`} className="not-prose text-xs" />
        ) : null}
        {props.children}
      </div>
    </div>
  );
}

export function PySourceCode({ children }: { children: ReactNode }) {
  return (
    <Collapsible className="my-6">
      <CollapsibleTrigger
        className={cn(
          buttonVariants({
            color: 'secondary',
            size: 'sm',
            className: 'group',
          }),
        )}
      >
        Source Code
        <ChevronRight className="size-3.5 text-fd-muted-foreground group-data-[panel-open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="prose-no-margin">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function PyFunctionReturn({ type, children }: { type?: string; children: ReactNode }) {
  return (
    <div className="border bg-fd-secondary rounded-lg p-3 mt-2">
      <div className="flex flex-wrap gap-2 not-prose">
        <p className="font-medium me-auto">Returns</p>
        <InlineCode lang="python" code={type ?? 'None'} className="text-xs" />
      </div>
      {children}
    </div>
  );
}

async function InlineCode({
  lang,
  code,
  ...rest
}: ComponentProps<'span'> & {
  lang: string;
  code: string;
}) {
  return highlight(code, {
    lang,
    components: {
      pre: (props) => <span {...props} {...rest} className={cn(rest.className, props.className)} />,
    },
  });
}

export { Tab, Tabs } from 'fumadocs-ui/components/tabs';
