'use client';
import { Callout } from 'fumadocs-ui/components/callout';
import { ComponentProps } from 'react';

export function CalloutStory(
  props: Pick<ComponentProps<typeof Callout>, 'title' | 'type' | 'children'>,
) {
  return <Callout {...props} className="my-0" />;
}
