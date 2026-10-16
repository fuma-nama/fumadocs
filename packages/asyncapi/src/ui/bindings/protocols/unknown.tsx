'use client';
import { JsonValue } from '../shared';

export function UnknownBinding({ binding }: { binding: Record<string, unknown> }) {
  return (
    <dl className="not-prose py-2">
      <dd>
        <JsonValue value={binding} />
      </dd>
    </dl>
  );
}
