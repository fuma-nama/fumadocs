'use client';
import type { JmsServerBinding } from '@/types/asyncapi-3';
import {
  CodeRow,
  createBinding,
  DestinationChannelBinding,
  Fields,
  HeadersMessageBinding,
  ValueRow,
} from '../shared';

function JmsServerBinding({ binding }: { binding: JmsServerBinding }) {
  return (
    <Fields>
      <CodeRow label="Connection Factory" value={binding.jmsConnectionFactory} />
      <CodeRow label="Client ID" value={binding.clientID} />
      {binding.properties?.map((property, index) => (
        <ValueRow
          key={index}
          label={property.name ?? `Property ${index + 1}`}
          value={property.value}
        />
      ))}
    </Fields>
  );
}

export const jmsBinding = createBinding({
  label: 'JMS',
  Server: JmsServerBinding,
  Channel: DestinationChannelBinding,
  Message: HeadersMessageBinding,
});
