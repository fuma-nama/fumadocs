'use client';
import type { Mqtt5ServerBinding } from '@/types/asyncapi-3';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingFieldRow,
  BindingScalarValue,
  BindingSchema,
} from '../shared';

function Mqtt5ServerBinding({ binding }: { binding: Mqtt5ServerBinding }) {
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
