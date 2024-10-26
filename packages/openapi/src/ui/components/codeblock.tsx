import { Fragment, type ReactNode, useEffect, useState } from 'react';
import * as Base from 'fumadocs-ui/components/codeblock';
import { useApiContext } from '@/ui/contexts/api';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { jsx, jsxs } from 'react/jsx-runtime';

export type CodeBlockProps = {
  code: string;
  lang?: string;
};

export function CodeBlock({ code, lang = 'json' }: CodeBlockProps): ReactNode {
  const { highlight } = useApiContext();
  const [rendered, setRendered] = useState<ReactNode>(
    <Base.Pre className="max-h-[288px]">{code}</Base.Pre>,
  );

  useEffect(() => {
    void highlight(lang, code).then((res) => {
      const output = toJsxRuntime(res, {
        jsx,
        jsxs,
        development: false,
        Fragment,
        components: {
          pre: (props) => (
            <Base.Pre className="max-h-[288px]" {...props}>
              {props.children}
            </Base.Pre>
          ),
        },
      });

      setRendered(output);
    });
  }, [code, highlight, lang]);

  return <Base.CodeBlock className="my-0">{rendered}</Base.CodeBlock>;
}
