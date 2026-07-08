import { TinaMarkdown, type TinaMarkdownContent, type Components } from 'tinacms/dist/rich-text';
import { createHeadingComponents } from '@fumadocs/tinacms/client';
import { Callout, type CalloutType } from 'fumadocs-ui/components/callout';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

type TemplateProps = {
  Callout: {
    type?: CalloutType;
    title?: string;
    children?: TinaMarkdownContent;
  };
};

function components(): Components<TemplateProps> {
  return {
    // add anchors to headings, so that TOC items can link to them
    ...createHeadingComponents(),
    code_block: (props) => (
      <DynamicCodeBlock lang={props?.lang ?? 'plaintext'} code={props?.value ?? ''} />
    ),
    Callout: (props) => (
      <Callout type={props.type} title={props.title}>
        {props.children && <TinaMarkdown content={props.children} />}
      </Callout>
    ),
  };
}

export function Markdown({ content }: { content: unknown }) {
  return <TinaMarkdown content={content as TinaMarkdownContent} components={components()} />;
}
