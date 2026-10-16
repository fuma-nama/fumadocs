'use client';
import type { SolaceOperationBinding, SolaceServerBinding } from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields, GroupRow, SchemaRow, ValueRow } from '../shared';

function formatDeliveryMode(value?: string) {
  if (value === 'direct') return 'Direct';
  if (value === 'persistent') return 'Persistent';
  return value;
}

function SolaceServerBinding({ binding }: { binding: SolaceServerBinding }) {
  return (
    <Fields>
      <CodeRow label="Message VPN" value={binding.msgVpn} />
      <CodeRow label="Client Name" value={binding.clientName} />
    </Fields>
  );
}

function SolaceOperationBinding({ binding }: { binding: SolaceOperationBinding }) {
  return (
    <Fields>
      {binding.destinations?.map(({ destinationType, deliveryMode, queue, topic }, index) => (
        <GroupRow
          key={index}
          label={`Destination ${index + 1}`}
          title={queue?.name ?? topic?.topicSubscriptions?.[0] ?? `Destination ${index + 1}`}
        >
          <CodeRow label="Destination Type" value={destinationType} />
          <CodeRow label="Delivery Mode" value={formatDeliveryMode(deliveryMode)} />
          <CodeRow label="Queue Name" value={queue?.name} />
          <ValueRow label="Topic Subscriptions" value={queue?.topicSubscriptions} />
          <CodeRow label="Access Type" value={queue?.accessType} />
          <ValueRow label="Max Message Spool Size" value={queue?.maxMsgSpoolSize} />
          <ValueRow label="Max TTL" value={queue?.maxTtl} />
          <ValueRow label="Topic Subscriptions" value={topic?.topicSubscriptions} />
        </GroupRow>
      ))}
      <SchemaRow label="Time to Live" name="timeToLive" value={binding.timeToLive} />
      <SchemaRow label="Priority" name="priority" value={binding.priority} />
      <ValueRow label="DMQ Eligible" value={binding.dmqEligible} />
    </Fields>
  );
}

export const solaceBinding = createBinding({
  label: 'Solace',
  Server: SolaceServerBinding,
  Operation: SolaceOperationBinding,
});
