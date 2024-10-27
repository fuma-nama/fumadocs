import { type ReactNode } from 'react';
import * as Base from 'fumadocs-ui/components/codeblock';
import { useApiContext } from '@/ui/contexts/api';
import { useShiki } from 'fumadocs-core/utils/use-shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

export type CodeBlockProps = {
  code: string;
  lang?: string;
};

const jsRegex = createJavaScriptRegexEngine();
export function CodeBlock({ code, lang = 'json' }: CodeBlockProps): ReactNode {
  const { shikiOptions } = useApiContext();

  const rendered = useShiki(code, {
    lang,
    ...shikiOptions,
    engine: jsRegex,
    components: {
      pre: (props) => (
        <Base.Pre className="max-h-[288px]" {...props}>
          {props.children}
        </Base.Pre>
      ),
    },
  });

  return <Base.CodeBlock className="my-0">{rendered}</Base.CodeBlock>;
}
