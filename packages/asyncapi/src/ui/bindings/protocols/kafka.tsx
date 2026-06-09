'use client';
import type {
  AsyncAPISchemaObject,
  KafkaChannelBinding,
  KafkaMessageBinding,
  KafkaOperationBinding,
} from '@/types/asyncapi-3';
import type { NoReference } from '@fumadocs/api-docs/schema';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingGroup,
  BindingFieldRow,
  BindingScalarValue,
  BindingSchema,
  formatBindingScalar,
} from '../shared';

function getKafkaChannelSummary(binding: NoReference<KafkaChannelBinding>): string | undefined {
  const parts: string[] = [];
  if (binding.topic) parts.push(binding.topic);
  if (typeof binding.partitions === 'number') {
    parts.push(`${binding.partitions} partition${binding.partitions === 1 ? '' : 's'}`);
  }
  if (typeof binding.replicas === 'number') {
    parts.push(`${binding.replicas} replica${binding.replicas === 1 ? '' : 's'}`);
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function getKafkaOperationSummary(binding: NoReference<KafkaOperationBinding>): string | undefined {
  const parts: string[] = [];
  const groupId = getBindingSchemaSummary(binding.groupId);
  const clientId = getBindingSchemaSummary(binding.clientId);
  if (binding.groupId) parts.push(`group: ${groupId}`);
  if (clientId) parts.push(`client: ${clientId}`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function getBindingSchemaSummary(
  schema: NoReference<AsyncAPISchemaObject> | undefined,
): string | undefined {
  if (typeof schema !== 'object') return;

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum.map((item) => formatBindingScalar(item)).join(', ');
  }

  if ('const' in schema) {
    return formatBindingScalar(schema.const);
  }

  if ('default' in schema) {
    return formatBindingScalar(schema.default);
  }

  if (typeof schema.type === 'string') {
    return schema.type;
  }
}

function getKafkaMessageSummary(binding: NoReference<KafkaMessageBinding>): string | undefined {
  const key = getBindingSchemaSummary(binding.key);
  return key ? `key: ${key}` : undefined;
}

function KafkaChannelBinding({ binding }: { binding: NoReference<KafkaChannelBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

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

function KafkaOperationBinding({ binding }: { binding: NoReference<KafkaOperationBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

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

function KafkaMessageBinding({ binding }: { binding: NoReference<KafkaMessageBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

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
  Channel: KafkaChannelBinding,
  Operation: KafkaOperationBinding,
  Message: KafkaMessageBinding,
  getChannelSummary: getKafkaChannelSummary,
  getOperationSummary: getKafkaOperationSummary,
  getMessageSummary: getKafkaMessageSummary,
});
