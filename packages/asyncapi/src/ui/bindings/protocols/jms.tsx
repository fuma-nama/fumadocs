'use client';
import type { JmsChannelBinding, JmsMessageBinding, JmsServerBinding } from '@/types/asyncapi-3';
import {
  createBinding,
  DestinationChannelBinding,
  HeadersMessageBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingFieldRow,
  BindingScalarValue,
  joinBindingSummary,
} from '../shared';

function getJmsServerSummary(binding: JmsServerBinding): string | undefined {
  return joinBindingSummary(binding.jmsConnectionFactory, binding.clientID);
}

function JmsServerBinding({ binding }: { binding: JmsServerBinding }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

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
  getServerSummary: getJmsServerSummary,
  getChannelSummary: (binding: JmsChannelBinding) =>
    joinBindingSummary(binding.destination, binding.destinationType),
});
