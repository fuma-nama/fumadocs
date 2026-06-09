'use client';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { createBinding } from '../shared';
import { useMemo } from 'react';

function UnknownBindingContent({ binding }: { binding: Record<string, unknown> }) {
  const code = useMemo(() => JSON.stringify(binding, null, 2), [binding]);
  return <ClientCodeBlock lang="json" code={code} />;
}

export const unknownBinding = createBinding({
  label: 'Unknown',
  Server: UnknownBindingContent,
  Channel: UnknownBindingContent,
  Operation: UnknownBindingContent,
  Message: UnknownBindingContent,
});
