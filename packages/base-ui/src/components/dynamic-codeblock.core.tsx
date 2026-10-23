'use client';
import { CodeBlock, type CodeBlockProps, Pre } from '@/components/codeblock';
import type { UseShikiOptions } from 'fumadocs-core/highlight/shiki/react';
import type { Highlighter } from 'fumadocs-core/highlight';
import { createShikiHighlighter } from 'fumadocs-core/highlight/shiki';
import { type Components, toJsx } from 'fumadocs-core/utils/hast-to-jsx';
import { cn } from '@/utils/cn';
import { type ComponentProps, createContext, type FC, Suspense, use, useMemo, useRef } from 'react';
import type { HighlighterCore } from 'shiki';

export interface DynamicCodeblockProps {
  highlighter: HighlighterCore | (() => HighlighterCore | PromiseLike<HighlighterCore>);
  lang: string;
  code: string;
  /**
   * Extra props for the underlying `<CodeBlock />` component.
   *
   * Ignored if you defined your own `pre` component in `options.components`.
   */
  codeblock?: CodeBlockProps;
  /**
   * Wrap in React `<Suspense />` and provide a fallback.
   *
   * @defaultValue true
   */
  wrapInSuspense?: boolean;
  options: DistributiveOmit<UseShikiOptions, 'lang'>;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

const PropsContext = createContext<CodeBlockProps | undefined>(undefined);

function DefaultPre(props: ComponentProps<'pre'>) {
  const extraProps = use(PropsContext);

  return (
    <CodeBlock
      {...props}
      {...extraProps}
      className={cn('my-0', props.className, extraProps?.className)}
    >
      <Pre>{props.children}</Pre>
    </CodeBlock>
  );
}

/**
 * Create a code block that highlights with your own highlighter.
 */
export function createDynamicCodeBlock({ highlighter }: { highlighter: Highlighter }) {
  return function DynamicCodeBlock(props: Omit<DynamicCodeblockProps, 'highlighter' | 'options'>) {
    return <Base highlighter={highlighter} components={{ pre: DefaultPre }} {...props} />;
  };
}

export function DynamicCodeBlock({
  highlighter,
  options,
  wrapInSuspense = true,
  ...props
}: DynamicCodeblockProps) {
  const initial = useRef({ highlighter, options });
  const instance = useMemo(
    () =>
      createShikiHighlighter(initial.current.highlighter, {
        defaultColor: false,
        ...initial.current.options,
      }),
    [],
  );
  const node = (
    <Base
      highlighter={instance}
      components={{ pre: DefaultPre, ...options?.components }}
      wrapInSuspense={wrapInSuspense}
      {...props}
    />
  );

  // a parent boundary suspending on it would discard `instance`
  return wrapInSuspense ? node : <Suspense>{node}</Suspense>;
}

function Base({
  highlighter,
  lang,
  code,
  codeblock,
  wrapInSuspense = true,
  components,
}: Omit<DynamicCodeblockProps, 'highlighter' | 'options'> & {
  highlighter: Highlighter;
  components: Partial<Components>;
}) {
  let node = (
    <Highlighted highlighter={highlighter} lang={lang} code={code} components={components} />
  );
  // only loading suspends, React keeps the fallback of large boundaries in server HTML
  if (wrapInSuspense && highlighter.loadLanguage) {
    node = (
      <Suspense fallback={<Placeholder code={code} components={components} />}>{node}</Suspense>
    );
  }

  return <PropsContext value={codeblock}>{node}</PropsContext>;
}

const languages = new WeakMap<Highlighter, Map<string, Promise<void>>>();

function Highlighted({
  highlighter,
  lang,
  code,
  components,
}: {
  highlighter: Highlighter;
  lang: string;
  code: string;
  components: Partial<Components>;
}) {
  if (highlighter.loadLanguage) {
    let loading = languages.get(highlighter);
    if (!loading) languages.set(highlighter, (loading = new Map()));
    let promise = loading.get(lang);
    if (!promise) loading.set(lang, (promise = highlighter.loadLanguage(lang)));
    use(promise);
  }

  return toJsx(highlighter.codeToHast(code, { lang }), { components });
}

function Placeholder({
  code,
  components = {},
}: {
  code: string;
  components: UseShikiOptions['components'];
}) {
  const { pre: Pre = 'pre', code: Code = 'code' } = components as Record<string, FC>;

  return (
    <Pre>
      <Code>
        {code.split('\n').map((line, i) => (
          <span key={i} className="line">
            {line}
          </span>
        ))}
      </Code>
    </Pre>
  );
}
