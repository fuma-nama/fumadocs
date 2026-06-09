'use client';
import type { MqttMessageBinding, MqttOperationBinding } from '@/types/asyncapi-3';
import type { NoReference } from '@fumadocs/api-docs/schema';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingFieldRow,
  BindingScalarValue,
  BindingSchema,
  joinBindingSummary,
} from '../shared';

function formatQos(value: number): string {
  if (value === 0) return 'At most once (0)';
  if (value === 1) return 'At least once (1)';
  if (value === 2) return 'Exactly once (2)';
  return String(value);
}

function formatPayloadFormatIndicator(value: number): string {
  if (value === 0) return 'Unspecified bytes (0)';
  if (value === 1) return 'UTF-8 (1)';
  return String(value);
}

function getMqttOperationSummary(binding: NoReference<MqttOperationBinding>): string | undefined {
  return joinBindingSummary(
    binding.qos !== undefined && formatQos(binding.qos),
    binding.retain && 'retain',
  );
}

function getMqttMessageSummary(binding: NoReference<MqttMessageBinding>): string | undefined {
  return binding.contentType;
}

function MqttOperationBinding({ binding }: { binding: NoReference<MqttOperationBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.qos !== undefined && (
        <BindingFieldRow
          label="Quality of Service"
          value={<code className="text-xs">{formatQos(binding.qos)}</code>}
        />
      )}
      {binding.retain !== undefined && (
        <BindingFieldRow
          label="Retain Flag"
          value={<BindingScalarValue value={binding.retain} />}
        />
      )}
      {binding.messageExpiryInterval !== undefined && (
        <BindingFieldRow
          label="Message Expiry Interval"
          value={
            typeof binding.messageExpiryInterval === 'object' ? (
              <BindingSchema name="messageExpiryInterval" schema={binding.messageExpiryInterval} />
            ) : (
              <BindingScalarValue value={binding.messageExpiryInterval} />
            )
          }
        />
      )}
    </BindingFields>
  );
}

function MqttMessageBinding({ binding }: { binding: NoReference<MqttMessageBinding> }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.payloadFormatIndicator !== undefined && (
        <BindingFieldRow
          label="Payload Format Indicator"
          value={
            <code className="text-xs">
              {formatPayloadFormatIndicator(binding.payloadFormatIndicator)}
            </code>
          }
        />
      )}
      {binding.correlationData && (
        <BindingFieldRow
          label="Correlation Data"
          value={<BindingSchema name="correlationData" schema={binding.correlationData} />}
        />
      )}
      {binding.contentType && (
        <BindingFieldRow
          label="Content Type"
          value={<code className="text-xs">{binding.contentType}</code>}
        />
      )}
      {binding.responseTopic && (
        <BindingFieldRow
          label="Response Topic"
          value={
            typeof binding.responseTopic === 'object' ? (
              <BindingSchema name="responseTopic" schema={binding.responseTopic} />
            ) : (
              <code className="text-xs">{binding.responseTopic}</code>
            )
          }
        />
      )}
    </BindingFields>
  );
}
export const mqttBinding = createBinding({
  label: 'MQTT',
  Operation: MqttOperationBinding,
  Message: MqttMessageBinding,
  getOperationSummary: getMqttOperationSummary,
  getMessageSummary: getMqttMessageSummary,
});
