'use client';
import type { WsChannelBinding } from '@/types/asyncapi-3';
import type { NoReference } from '@fumadocs/api-docs/schema';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingFieldRow,
  BindingScalarValue,
  BindingSchema,
} from '../shared';

function getWsChannelSummary(binding: NoReference<WsChannelBinding>): string | undefined {
  return binding.method;
}

function WsChannelBinding({ binding }: { binding: NoReference<WsChannelBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.method && (
        <BindingFieldRow label="Method" value={<BindingScalarValue value={binding.method} />} />
      )}
      {binding.query && (
        <BindingFieldRow
          label="Query"
          value={<BindingSchema name="query" schema={binding.query} />}
        />
      )}
      {binding.headers && (
        <BindingFieldRow
          label="Headers"
          value={<BindingSchema name="headers" schema={binding.headers} />}
        />
      )}
    </BindingFields>
  );
}

export const wsBinding = createBinding({
  label: 'WebSocket',
  Channel: WsChannelBinding,
  getChannelSummary: getWsChannelSummary,
});
