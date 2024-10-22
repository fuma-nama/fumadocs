import { type ReactNode } from 'react';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';

export default function Preview(): ReactNode {
  return (
    <InlineTOC
      items={[
        { title: 'Welcome', url: '#welcome', depth: 2 },
        { title: 'Getting Started', url: '#getting-started', depth: 3 },
        { title: 'Usage', url: '#usage', depth: 3 },
        { title: 'Styling', url: '#styling', depth: 3 },
        { title: 'Reference', url: '#reference', depth: 2 },
        { title: 'Components', url: '#components', depth: 3 },
        { title: 'APIs', url: '#api', depth: 3 },
        { title: 'Credits', url: '#credits', depth: 2 },
      ]}
    />
  );
}
