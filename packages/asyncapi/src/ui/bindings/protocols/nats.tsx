'use client';
import type { NatsOperationBinding } from '@/types/asyncapi-3';
import { createBinding, BindingFields, BindingFieldRow } from '../shared';

function NatsOperationBinding({ binding }: { binding: NatsOperationBinding }) {
  return (
    <BindingFields>
      {binding.queue && (
        <BindingFieldRow label="Queue" value={<code className="text-xs">{binding.queue}</code>} />
      )}
    </BindingFields>
  );
}

export const natsBinding = createBinding({
  label: 'NATS',
  Operation: NatsOperationBinding,
});
