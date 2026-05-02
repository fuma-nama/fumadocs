import type {
  PortableTextBlockComponent,
  PortableTextMarkComponent,
  PortableTextTypeComponent,
} from '@portabletext/react';
import Link from 'fumadocs-core/link';
import { Heading } from 'fumadocs-ui/components/heading';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

const baseHeading: PortableTextBlockComponent = (props) => {
  return (
    <Heading id={props.value._key} as={props.value.style as 'h1'}>
      {props.children}
    </Heading>
  );
};

export const baseBlocks: Record<
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  PortableTextBlockComponent
> = {
  h1: baseHeading,
  h2: baseHeading,
  h3: baseHeading,
  h4: baseHeading,
  h5: baseHeading,
  h6: baseHeading,
};

export interface CodeValue {
  _type: 'code';
  language?: string;
  code?: string;
}

export const baseComponents: {
  code: PortableTextTypeComponent<CodeValue>;
} = {
  code: (props) => (
    <DynamicCodeBlock lang={props.value.language ?? 'text'} code={props.value.code ?? ''} />
  ),
};

export const baseMarks: {
  links: PortableTextMarkComponent;
} = {
  links: (props) => (
    <Link href={props.value.href} key={props.markKey}>
      {props.children}
    </Link>
  ),
};
