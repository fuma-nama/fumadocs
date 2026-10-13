import { Callout } from 'fumadocs-ui/components/callout';
import type { ComponentProps } from 'react';

export function CalloutStory(
  props: Pick<ComponentProps<typeof Callout>, 'title' | 'type' | 'children'>,
) {
  return <Callout {...props} className="my-0" />;
}
