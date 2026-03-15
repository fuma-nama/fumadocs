import { CodeBlock, type CodeBlockProps, Pre } from './codeblock';
import { highlight, type HighlightOptions } from 'fumadocs-core/highlight';
import { cn } from '@/utils/cn';

export type ServerCodeBlockProps = HighlightOptions & {
  code: string;

  /**
   * Extra props for the underlying `<CodeBlock />` component.
   *
   * Ignored if you defined your own `pre` component in `components`.
   */
  codeblock?: CodeBlockProps;
};

export async function ServerCodeBlock({ code, codeblock, ...options }: ServerCodeBlockProps) {
  return await highlight(code, {
    defaultColor: false,
    ...options,
    components: {
      pre: (props) => (
        <CodeBlock
          {...props}
          {...codeblock}
          className={cn('my-0', props.className, codeblock?.className)}
        >
          <Pre>{props.children}</Pre>
        </CodeBlock>
      ),
      ...options.components,
    },
  });
}
