import { useApiContext } from '@/ui/contexts/api';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

export type CodeBlockProps = {
  code: string;
  lang?: string;
};

export function CodeBlock({ code, lang = 'json' }: CodeBlockProps) {
  const { shikiOptions } = useApiContext();

  return <DynamicCodeBlock lang={lang} code={code} options={shikiOptions} />;
}
