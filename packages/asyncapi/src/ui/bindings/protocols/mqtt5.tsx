'use client';
import type { Mqtt5ServerBinding } from '@/types/asyncapi-3';
import { createBinding, Fields, SchemaRow } from '../shared';

function Mqtt5ServerBinding({ binding }: { binding: Mqtt5ServerBinding }) {
  return (
    <Fields>
      <SchemaRow
        label="Session Expiry Interval"
        name="sessionExpiryInterval"
        value={binding.sessionExpiryInterval}
      />
    </Fields>
  );
}

export const mqtt5Binding = createBinding({
  label: 'MQTT 5',
  Server: Mqtt5ServerBinding,
});
