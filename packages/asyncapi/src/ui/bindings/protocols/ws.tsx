'use client';
import type { WsChannelBinding } from '@/types/asyncapi-3';
import { createBinding, Fields, ValueRow } from '../shared';

// `query` and `headers` are parameters of the connection, rendered with the other parameters
function WsChannelBinding({ binding }: { binding: WsChannelBinding }) {
  if (!binding.method || binding.method === 'GET') return null;

  return (
    <Fields>
      <ValueRow label="Method" value={binding.method} />
    </Fields>
  );
}

export const wsBinding = createBinding({
  label: 'WebSocket',
  Channel: WsChannelBinding,
});
