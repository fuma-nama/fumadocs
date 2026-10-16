'use client';
import type { WsChannelBinding } from '@/types/asyncapi-3';
import { createBinding, BindingFields, BindingFieldRow, BindingScalarValue } from '../shared';

// `query` and `headers` are parameters of the connection, rendered with the other parameters
function WsChannelBinding({ binding }: { binding: WsChannelBinding }) {
  if (!binding.method || binding.method === 'GET') return null;

  return (
    <BindingFields>
      <BindingFieldRow label="Method" value={<BindingScalarValue value={binding.method} />} />
    </BindingFields>
  );
}

export const wsBinding = createBinding({
  label: 'WebSocket',
  Channel: WsChannelBinding,
});
