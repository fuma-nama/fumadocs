'use client';
import { CodeBlock, type CodeBlockProps, Pre } from '@/components/codeblock';
import type {
  HighlightOptions,
  HighlightOptionsCommon,
  HighlightOptionsThemes,
} from 'fumadocs-core/highlight';
import { useShiki } from 'fumadocs-core/highlight/client';
import { cn } from '@/utils/cn';
import {
  type ComponentProps,
  createContext,
  type FC,
  Suspense,
  use,
  useDeferredValue,
  useId,
} from 'react';

export interface DynamicCodeblockProps {
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
  options?: Omit<HighlightOptionsCommon, 'lang'> & HighlightOptionsThemes;
}

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

export function DynamicCodeBlock({
  lang,
  code,
  codeblock,
  options,
  wrapInSuspense = true,
}: DynamicCodeblockProps) {
  const id = useId();
  const shikiOptions = {
    lang,
    ...options,
    components: {
      pre: DefaultPre,
      ...options?.components,
    },
  } satisfies HighlightOptions;

  const children = (
    <PropsContext value={codeblock}>
      <Internal
        id={id}
        {...useDeferredValue({ code, options: shikiOptions })}
      />
    </PropsContext>
  );

  if (wrapInSuspense)
    return (
      <Suspense
        fallback={
          <Placeholder code={code} components={shikiOptions.components} />
        }
      >
        {children}
      </Suspense>
    );

  return children;
}

function Placeholder({
  code,
  components = {},
}: {
  code: string;
  components: HighlightOptions['components'];
}) {
  const { pre: Pre = 'pre', code: Code = 'code' } = components as Record<
    string,
    FC
  >;

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

function Internal({
  id,
  code,
  options,
}: {
  id: string;
  code: string;
  options: HighlightOptions;
}) {
  return useShiki(code, options, [id, options.lang, code]);
}
