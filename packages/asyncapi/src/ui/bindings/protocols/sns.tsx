'use client';
import type { SnsChannelBinding, SnsOperationBinding } from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields, GroupRow, JsonRow, TagsRow, ValueRow } from '../shared';

function Identifier({
  label,
  value,
}: {
  label: string;
  value: NonNullable<SnsOperationBinding['topic']>;
}) {
  return (
    <GroupRow label={label} title={label}>
      <CodeRow label="Name" value={value.name} />
      <ValueRow label="ARN" value={value.arn} />
      <ValueRow label="URL" value={value.url} />
      <CodeRow label="Email" value={value.email} />
      <CodeRow label="Phone" value={value.phone} />
    </GroupRow>
  );
}

function SnsChannelBinding({ binding }: { binding: SnsChannelBinding }) {
  const { ordering } = binding;

  return (
    <Fields>
      <CodeRow label="Name" value={binding.name} />
      {ordering && (
        <GroupRow label="Ordering" title="FIFO Settings">
          <ValueRow label="Type" value={ordering.type} />
          <ValueRow
            label="Content-Based Deduplication"
            value={ordering.contentBasedDeduplication}
          />
        </GroupRow>
      )}
      <JsonRow label="Policy" value={binding.policy} />
      <TagsRow label="Tags" value={binding.tags} />
    </Fields>
  );
}

function SnsOperationBinding({ binding }: { binding: SnsOperationBinding }) {
  return (
    <Fields>
      {binding.topic && <Identifier label="Topic" value={binding.topic} />}
      {binding.consumers?.map((consumer, index) => (
        <GroupRow
          key={index}
          label={`Consumer ${index + 1}`}
          title={consumer.displayName ?? `Consumer ${index + 1}`}
        >
          <CodeRow label="Protocol" value={consumer.protocol} />
          {consumer.endpoint && <Identifier label="Endpoint" value={consumer.endpoint} />}
          <ValueRow label="Raw Message Delivery" value={consumer.rawMessageDelivery} />
          <JsonRow label="Filter Policy" value={consumer.filterPolicy} />
          <CodeRow label="Filter Policy Scope" value={consumer.filterPolicyScope} />
          <JsonRow label="Redrive Policy" value={consumer.redrivePolicy} />
          <JsonRow label="Delivery Policy" value={consumer.deliveryPolicy} />
        </GroupRow>
      ))}
      <JsonRow label="Delivery Policy" value={binding.deliveryPolicy} />
    </Fields>
  );
}

export const snsBinding = createBinding({
  label: 'Amazon SNS',
  Channel: SnsChannelBinding,
  Operation: SnsOperationBinding,
});
