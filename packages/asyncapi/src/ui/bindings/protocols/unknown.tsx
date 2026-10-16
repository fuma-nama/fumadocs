'use client';
import { BindingJson, createBinding } from '../shared';

function UnknownBindingContent({ binding }: { binding: Record<string, unknown> }) {
  return (
    <dl className="not-prose py-2">
      <dd>
        <BindingJson value={binding} />
      </dd>
    </dl>
  );
}

export const unknownBinding = createBinding({
  label: 'Unknown',
  Server: UnknownBindingContent,
  Channel: UnknownBindingContent,
  Operation: UnknownBindingContent,
  Message: UnknownBindingContent,
});
