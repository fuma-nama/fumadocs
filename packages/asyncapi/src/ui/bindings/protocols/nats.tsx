'use client';
import type { NatsOperationBinding } from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields } from '../shared';

function NatsOperationBinding({ binding }: { binding: NatsOperationBinding }) {
  return (
    <Fields>
      <CodeRow label="Queue" value={binding.queue} />
    </Fields>
  );
}

export const natsBinding = createBinding({
  label: 'NATS',
  Operation: NatsOperationBinding,
});
