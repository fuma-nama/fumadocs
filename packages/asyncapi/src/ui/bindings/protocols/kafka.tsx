'use client';
import type {
  KafkaChannelBinding,
  KafkaMessageBinding,
  KafkaOperationBinding,
  KafkaServerBinding,
} from '@/types/asyncapi-3';
import {
  createBinding,
  BindingFields,
  BindingGroup,
  BindingFieldRow,
  BindingScalarValue,
  BindingSchema,
} from '../shared';

function KafkaServerBinding({ binding }: { binding: KafkaServerBinding }) {
  return (
    <BindingFields>
      {binding.schemaRegistryUrl && (
        <BindingFieldRow
          label="Schema Registry URL"
          value={<code className="text-xs">{binding.schemaRegistryUrl}</code>}
        />
      )}
      {binding.schemaRegistryVendor && (
        <BindingFieldRow
          label="Schema Registry Vendor"
          value={<code className="text-xs">{binding.schemaRegistryVendor}</code>}
        />
      )}
    </BindingFields>
  );
}

function KafkaChannelBinding({ binding }: { binding: KafkaChannelBinding }) {
  return (
    <BindingFields>
      {binding.topic && (
        <BindingFieldRow label="Topic" value={<code className="text-xs">{binding.topic}</code>} />
      )}
      {typeof binding.partitions === 'number' && (
        <BindingFieldRow
          label="Partitions"
          value={<BindingScalarValue value={binding.partitions} />}
        />
      )}
      {typeof binding.replicas === 'number' && (
        <BindingFieldRow label="Replicas" value={<BindingScalarValue value={binding.replicas} />} />
      )}
      {binding.topicConfiguration && (
        <BindingFieldRow
          label="Topic Configuration"
          value={
            <BindingGroup title="Kafka topic settings">
              <BindingFields>
                {Object.entries(binding.topicConfiguration).map(([key, value]) => (
                  <BindingFieldRow
                    key={key}
                    label={key}
                    value={<BindingScalarValue value={value} />}
                  />
                ))}
              </BindingFields>
            </BindingGroup>
          }
        />
      )}
    </BindingFields>
  );
}

function KafkaOperationBinding({ binding }: { binding: KafkaOperationBinding }) {
  return (
    <BindingFields>
      {binding.groupId && (
        <BindingFieldRow
          label="Consumer Group"
          value={<BindingSchema name="groupId" schema={binding.groupId} />}
        />
      )}
      {binding.clientId && (
        <BindingFieldRow
          label="Client ID"
          value={<BindingSchema name="clientId" schema={binding.clientId} />}
        />
      )}
    </BindingFields>
  );
}

function KafkaMessageBinding({ binding }: { binding: KafkaMessageBinding }) {
  return (
    <BindingFields>
      {binding.key && (
        <BindingFieldRow
          label="Message Key"
          value={<BindingSchema name="key" schema={binding.key} />}
        />
      )}
      {binding.schemaIdLocation && (
        <BindingFieldRow
          label="Schema ID Location"
          value={<BindingScalarValue value={binding.schemaIdLocation} />}
        />
      )}
      {binding.schemaIdPayloadEncoding && (
        <BindingFieldRow
          label="Schema ID Payload Encoding"
          value={<code className="text-xs">{binding.schemaIdPayloadEncoding}</code>}
        />
      )}
      {binding.schemaLookupStrategy && (
        <BindingFieldRow
          label="Schema Lookup Strategy"
          value={<code className="text-xs">{binding.schemaLookupStrategy}</code>}
        />
      )}
    </BindingFields>
  );
}

export const kafkaBinding = createBinding({
  label: 'Kafka',
  Server: KafkaServerBinding,
  Channel: KafkaChannelBinding,
  Operation: KafkaOperationBinding,
  Message: KafkaMessageBinding,
});
