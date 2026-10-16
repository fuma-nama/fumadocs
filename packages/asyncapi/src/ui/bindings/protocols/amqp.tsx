'use client';
import type {
  AmqpChannelBinding,
  AmqpMessageBinding,
  AmqpOperationBinding,
} from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields, GroupRow, ValueRow } from '../shared';

function formatAmqpIs(value?: string) {
  if (value === 'queue') return 'Queue';
  if (value === 'routingKey') return 'Routing Key';
  return value;
}

function formatAmqpDeliveryMode(value?: number) {
  if (value === 1) return 'Non-persistent (1)';
  if (value === 2) return 'Persistent (2)';
  return value?.toString();
}

function AmqpChannelBinding({ binding: { is, exchange, queue } }: { binding: AmqpChannelBinding }) {
  return (
    <Fields>
      <CodeRow label="Binding Target" value={formatAmqpIs(is)} />
      {exchange && (
        <GroupRow label="Exchange" title="Exchange">
          <CodeRow label="Name" value={exchange.name} />
          <ValueRow label="Type" value={exchange.type} />
          <ValueRow label="Durable" value={exchange.durable} />
          <ValueRow label="Auto Delete" value={exchange.autoDelete} />
          <CodeRow label="Virtual Host" value={exchange.vhost} />
        </GroupRow>
      )}
      {queue && (
        <GroupRow label="Queue" title="Queue">
          <CodeRow label="Name" value={queue.name} />
          <ValueRow label="Durable" value={queue.durable} />
          <ValueRow label="Exclusive" value={queue.exclusive} />
          <ValueRow label="Auto Delete" value={queue.autoDelete} />
          <CodeRow label="Virtual Host" value={queue.vhost} />
        </GroupRow>
      )}
    </Fields>
  );
}

function AmqpOperationBinding({ binding }: { binding: AmqpOperationBinding }) {
  return (
    <Fields>
      <ValueRow label="Message TTL" value={binding.expiration} />
      <CodeRow label="User ID" value={binding.userId} />
      <ValueRow label="CC" value={binding.cc} />
      <ValueRow label="BCC" value={binding.bcc} />
      <ValueRow label="Priority" value={binding.priority} />
      <CodeRow label="Delivery Mode" value={formatAmqpDeliveryMode(binding.deliveryMode)} />
      <ValueRow label="Mandatory" value={binding.mandatory} />
      <ValueRow label="Timestamp" value={binding.timestamp} />
      <ValueRow label="Acknowledgement" value={binding.ack} />
    </Fields>
  );
}

function AmqpMessageBinding({ binding }: { binding: AmqpMessageBinding }) {
  return (
    <Fields>
      <CodeRow label="Content Encoding" value={binding.contentEncoding} />
      <CodeRow label="Message Type" value={binding.messageType} />
    </Fields>
  );
}

export const amqpBinding = createBinding({
  label: 'AMQP',
  Channel: AmqpChannelBinding,
  Operation: AmqpOperationBinding,
  Message: AmqpMessageBinding,
});
