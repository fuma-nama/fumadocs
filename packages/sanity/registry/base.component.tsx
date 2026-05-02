'use client';
import type { PortableTextBlockComponent, PortableTextMarkComponent } from '@portabletext/react';
import Link from 'fumadocs-core/link';
import { Heading } from 'fumadocs-ui/components/heading';

const headingLevels = new Array(5).fill(0).map((_, i) => i + 1);
export const headingBlocks: Record<`h${number}`, PortableTextBlockComponent> = Object.fromEntries(
  headingLevels.map((h) => [
    `h${h}`,
    (props) => {
      const { value, children } = props;
      const { _key } = value;

      return (
        <Heading id={_key} as={`h${h}` as 'h1'}>
          {children}
        </Heading>
      );
    },
  ]),
);

export const linkMarks: Record<'links', PortableTextMarkComponent> = {
  links(props) {
    return (
      <Link href={props.value.href} key={props.markKey}>
        {props.children}
      </Link>
    );
  },
};
