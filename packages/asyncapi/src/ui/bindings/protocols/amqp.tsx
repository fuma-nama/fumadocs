'use client';
import type {
  AmqpChannelBinding,
  AmqpMessageBinding,
  AmqpOperationBinding,
} from '@/types/asyncapi-3';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingGroup,
  BindingFieldRow,
  BindingScalarValue,
  joinBindingSummary,
} from '../shared';

function formatAmqpIs(value: string): string {
  if (value === 'queue') return 'Queue';
  if (value === 'routingKey') return 'Routing Key';
  return value;
}

function formatAmqpDeliveryMode(value: number): string {
  if (value === 1) return 'Non-persistent (1)';
  if (value === 2) return 'Persistent (2)';
  return String(value);
}

function getAmqpChannelSummary(binding: AmqpChannelBinding): string | undefined {
  return joinBindingSummary(
    binding.is ? formatAmqpIs(binding.is) : undefined,
    binding.exchange?.name ? `exchange: ${binding.exchange.name}` : undefined,
    binding.queue?.name ? `queue: ${binding.queue.name}` : undefined,
  );
}

function getAmqpMessageSummary(binding: AmqpMessageBinding): string | undefined {
  const parts: string[] = [];
  if (binding.contentEncoding) parts.push(binding.contentEncoding);
  if (binding.messageType) parts.push(binding.messageType);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function AmqpExchangeFields({
  exchange,
}: {
  exchange: NonNullable<AmqpChannelBinding['exchange']>;
}) {
  return (
    <BindingFields>
      {exchange.name && (
        <BindingFieldRow label="Name" value={<code className="text-xs">{exchange.name}</code>} />
      )}
      {exchange.type && (
        <BindingFieldRow label="Type" value={<BindingScalarValue value={exchange.type} />} />
      )}
      {exchange.durable !== undefined && (
        <BindingFieldRow label="Durable" value={<BindingScalarValue value={exchange.durable} />} />
      )}
      {exchange.autoDelete !== undefined && (
        <BindingFieldRow
          label="Auto Delete"
          value={<BindingScalarValue value={exchange.autoDelete} />}
        />
      )}
      {exchange.vhost && (
        <BindingFieldRow
          label="Virtual Host"
          value={<code className="text-xs">{exchange.vhost}</code>}
        />
      )}
    </BindingFields>
  );
}

function AmqpQueueFields({ queue }: { queue: NonNullable<AmqpChannelBinding['queue']> }) {
  return (
    <BindingFields>
      {queue.name && (
        <BindingFieldRow label="Name" value={<code className="text-xs">{queue.name}</code>} />
      )}
      {queue.durable !== undefined && (
        <BindingFieldRow label="Durable" value={<BindingScalarValue value={queue.durable} />} />
      )}
      {queue.exclusive !== undefined && (
        <BindingFieldRow label="Exclusive" value={<BindingScalarValue value={queue.exclusive} />} />
      )}
      {queue.autoDelete !== undefined && (
        <BindingFieldRow
          label="Auto Delete"
          value={<BindingScalarValue value={queue.autoDelete} />}
        />
      )}
      {queue.vhost && (
        <BindingFieldRow
          label="Virtual Host"
          value={<code className="text-xs">{queue.vhost}</code>}
        />
      )}
    </BindingFields>
  );
}

function AmqpChannelBinding({ binding }: { binding: AmqpChannelBinding }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.is && (
        <BindingFieldRow
          label="Binding Target"
          value={<code className="text-xs">{formatAmqpIs(binding.is)}</code>}
        />
      )}
      {binding.exchange && (
        <BindingFieldRow
          label="Exchange"
          value={
            <BindingGroup title="Exchange">
              <AmqpExchangeFields exchange={binding.exchange} />
            </BindingGroup>
          }
        />
      )}
      {binding.queue && (
        <BindingFieldRow
          label="Queue"
          value={
            <BindingGroup title="Queue">
              <AmqpQueueFields queue={binding.queue} />
            </BindingGroup>
          }
        />
      )}
    </BindingFields>
  );
}

function AmqpOperationBinding({ binding }: { binding: AmqpOperationBinding }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.expiration !== undefined && (
        <BindingFieldRow
          label="Message TTL"
          value={<BindingScalarValue value={binding.expiration} />}
        />
      )}
      {binding.userId && (
        <BindingFieldRow
          label="User ID"
          value={<code className="text-xs">{binding.userId}</code>}
        />
      )}
      {binding.cc && binding.cc.length > 0 && (
        <BindingFieldRow label="CC" value={<BindingScalarValue value={binding.cc} />} />
      )}
      {binding.bcc && binding.bcc.length > 0 && (
        <BindingFieldRow label="BCC" value={<BindingScalarValue value={binding.bcc} />} />
      )}
      {binding.priority !== undefined && (
        <BindingFieldRow label="Priority" value={<BindingScalarValue value={binding.priority} />} />
      )}
      {binding.deliveryMode !== undefined && (
        <BindingFieldRow
          label="Delivery Mode"
          value={<code className="text-xs">{formatAmqpDeliveryMode(binding.deliveryMode)}</code>}
        />
      )}
      {binding.mandatory !== undefined && (
        <BindingFieldRow
          label="Mandatory"
          value={<BindingScalarValue value={binding.mandatory} />}
        />
      )}
      {binding.timestamp !== undefined && (
        <BindingFieldRow
          label="Timestamp"
          value={<BindingScalarValue value={binding.timestamp} />}
        />
      )}
      {binding.ack !== undefined && (
        <BindingFieldRow
          label="Acknowledgement"
          value={<BindingScalarValue value={binding.ack} />}
        />
      )}
    </BindingFields>
  );
}

function AmqpMessageBinding({ binding }: { binding: AmqpMessageBinding }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.contentEncoding && (
        <BindingFieldRow
          label="Content Encoding"
          value={<code className="text-xs">{binding.contentEncoding}</code>}
        />
      )}
      {binding.messageType && (
        <BindingFieldRow
          label="Message Type"
          value={<code className="text-xs">{binding.messageType}</code>}
        />
      )}
    </BindingFields>
  );
}
export const amqpBinding = createBinding({
  label: 'AMQP',
  Channel: AmqpChannelBinding,
  Operation: AmqpOperationBinding,
  Message: AmqpMessageBinding,
  getChannelSummary: getAmqpChannelSummary,
  getMessageSummary: getAmqpMessageSummary,
});
