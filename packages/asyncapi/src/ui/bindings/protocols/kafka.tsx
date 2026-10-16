'use client';
import type {
  KafkaChannelBinding,
  KafkaMessageBinding,
  KafkaOperationBinding,
  KafkaServerBinding,
} from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields, GroupRow, SchemaRow, ValueRow } from '../shared';

function KafkaServerBinding({ binding }: { binding: KafkaServerBinding }) {
  return (
    <Fields>
      <CodeRow label="Schema Registry URL" value={binding.schemaRegistryUrl} />
      <CodeRow label="Schema Registry Vendor" value={binding.schemaRegistryVendor} />
    </Fields>
  );
}

function KafkaChannelBinding({ binding }: { binding: KafkaChannelBinding }) {
  return (
    <Fields>
      <CodeRow label="Topic" value={binding.topic} />
      <ValueRow label="Partitions" value={binding.partitions} />
      <ValueRow label="Replicas" value={binding.replicas} />
      {binding.topicConfiguration && (
        <GroupRow label="Topic Configuration" title="Kafka topic settings">
          {Object.entries(binding.topicConfiguration).map(([key, value]) => (
            <ValueRow key={key} label={key} value={value} />
          ))}
        </GroupRow>
      )}
    </Fields>
  );
}

function KafkaOperationBinding({ binding }: { binding: KafkaOperationBinding }) {
  return (
    <Fields>
      <SchemaRow label="Consumer Group" name="groupId" value={binding.groupId} />
      <SchemaRow label="Client ID" name="clientId" value={binding.clientId} />
    </Fields>
  );
}

function KafkaMessageBinding({ binding }: { binding: KafkaMessageBinding }) {
  return (
    <Fields>
      <SchemaRow label="Message Key" name="key" value={binding.key} />
      <ValueRow label="Schema ID Location" value={binding.schemaIdLocation} />
      <CodeRow label="Schema ID Payload Encoding" value={binding.schemaIdPayloadEncoding} />
      <CodeRow label="Schema Lookup Strategy" value={binding.schemaLookupStrategy} />
    </Fields>
  );
}

export const kafkaBinding = createBinding({
  label: 'Kafka',
  Server: KafkaServerBinding,
  Channel: KafkaChannelBinding,
  Operation: KafkaOperationBinding,
  Message: KafkaMessageBinding,
});
