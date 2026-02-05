'use client';
import { CodeBlock, type CodeBlockProps, Pre } from '@/components/codeblock';
import { useShikiDynamic, type UseShikiOptions } from 'fumadocs-core/highlight/core/client';
import { cn } from '@fumadocs/ui/cn';
import { type ComponentProps, createContext, type FC, use, useId } from 'react';

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
  options?: DistributiveOmit<UseShikiOptions, 'lang'>;
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

export function DynamicCodeBlock({
  lang,
  code,
  codeblock,
  options,
  wrapInSuspense = true,
}: DynamicCodeblockProps) {
  const id = useId();
  const shikiOptions: UseShikiOptions = {
    lang,
    ...options,
    components: {
      pre: DefaultPre,
      ...options?.components,
    },
  };
  let node = useShikiDynamic(code, shikiOptions, [id, lang, code]);
  if (wrapInSuspense) node ??= <Placeholder code={code} components={shikiOptions.components} />;

  return <PropsContext value={codeblock}>{node}</PropsContext>;
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
