import * as Base from './codeblock';
import { highlight, type HighlightOptions } from 'fumadocs-core/highlight';
import { cn } from '@/utils/cn';

export type ServerCodeBlockProps = HighlightOptions & {
  code: string;

  /**
   * Extra props for the underlying `<CodeBlock />` component.
   *
   * Ignored if you defined your own `pre` component in `components`.
   */
  codeblock?: Base.CodeBlockProps;
};

export async function ServerCodeBlock({ code, codeblock, ...options }: ServerCodeBlockProps) {
  return await highlight(code, {
    ...options,
    components: {
      pre: (props) => {
        <Base.CodeBlock
          {...props}
          {...codeblock}
          className={cn('my-0', props.className, codeblock?.className)}
        >
          <Base.Pre>{props.children}</Base.Pre>
        </Base.CodeBlock>;
      },
      ...options.components,
    },
  });
}
