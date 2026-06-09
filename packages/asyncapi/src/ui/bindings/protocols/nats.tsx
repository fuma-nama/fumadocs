'use client';
import type { NatsOperationBinding } from '@/types/asyncapi-3';
import type { NoReference } from '@fumadocs/api-docs/schema';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingFieldRow,
} from '../shared';

function getNatsOperationSummary(binding: NoReference<NatsOperationBinding>): string | undefined {
  return binding.queue;
}

function NatsOperationBinding({ binding }: { binding: NoReference<NatsOperationBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

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
  getOperationSummary: getNatsOperationSummary,
});
