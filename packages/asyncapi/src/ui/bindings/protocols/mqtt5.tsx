'use client';
import type { Mqtt5ServerBinding } from '@/types/asyncapi-3';
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

function Mqtt5ServerBinding({ binding }: { binding: NoReference<Mqtt5ServerBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.sessionExpiryInterval !== undefined && (
        <BindingFieldRow
          label="Session Expiry Interval"
          value={
            typeof binding.sessionExpiryInterval === 'object' ? (
              <BindingSchema name="sessionExpiryInterval" schema={binding.sessionExpiryInterval} />
            ) : (
              <BindingScalarValue value={binding.sessionExpiryInterval} />
            )
          }
        />
      )}
    </BindingFields>
  );
}

export const mqtt5Binding = createBinding({
  label: 'MQTT 5',
  Server: Mqtt5ServerBinding,
});
