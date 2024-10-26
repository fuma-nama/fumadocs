import * as Base from 'fumadocs-ui/components/codeblock';
import { highlight } from 'fumadocs-core/server';

export interface CodeBlockProps {
  code: string;
  wrapper?: Base.CodeBlockProps;
  lang: string;
}

export async function CodeBlock({
  code,
  lang,
  wrapper,
}: CodeBlockProps): Promise<React.ReactElement> {
  const rendered = await highlight(code, {
    lang,
    themes: {
      light: 'github-light',
      dark: 'vesper',
    },
    components: {
      // @ts-expect-error -- JSX component
      pre: Base.Pre,
    },
  });

  return <Base.CodeBlock {...wrapper}>{rendered}</Base.CodeBlock>;
}
