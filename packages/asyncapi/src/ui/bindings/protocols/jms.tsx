'use client';
import type { JmsChannelBinding, JmsMessageBinding, JmsServerBinding } from '@/types/asyncapi-3';
import {
  createBinding,
  DestinationChannelBinding,
  HeadersMessageBinding,
  BindingFields,
  BindingFieldRow,
  BindingScalarValue,
} from '../shared';

function JmsServerBinding({ binding }: { binding: JmsServerBinding }) {
  return (
    <BindingFields>
      {binding.jmsConnectionFactory && (
        <BindingFieldRow
          label="Connection Factory"
          value={<code className="text-xs">{binding.jmsConnectionFactory}</code>}
        />
      )}
      {binding.clientID && (
        <BindingFieldRow
          label="Client ID"
          value={<code className="text-xs">{binding.clientID}</code>}
        />
      )}
      {binding.properties?.map((property, index) => (
        <BindingFieldRow
          key={index}
          label={property.name ?? `Property ${index + 1}`}
          value={<BindingScalarValue value={property.value} />}
        />
      ))}
    </BindingFields>
  );
}

export const jmsBinding = createBinding({
  label: 'JMS',
  Server: JmsServerBinding,
  Channel: ({ binding }: { binding: JmsChannelBinding }) => (
    <DestinationChannelBinding binding={binding} />
  ),
  Message: ({ binding }: { binding: JmsMessageBinding }) => (
    <HeadersMessageBinding binding={binding} />
  ),
});
