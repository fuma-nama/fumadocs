'use client';
import type {
  MqttMessageBinding,
  MqttOperationBinding,
  MqttServerBinding,
} from '@/types/asyncapi-3';
import { CodeRow, createBinding, Fields, GroupRow, SchemaRow, ValueRow } from '../shared';

function formatQos(value?: number) {
  if (value === 0) return 'At most once (0)';
  if (value === 1) return 'At least once (1)';
  if (value === 2) return 'Exactly once (2)';
  return value?.toString();
}

function formatPayloadFormatIndicator(value?: number) {
  if (value === 0) return 'Unspecified bytes (0)';
  if (value === 1) return 'UTF-8 (1)';
  return value?.toString();
}

function MqttServerBinding({ binding }: { binding: MqttServerBinding }) {
  const { lastWill } = binding;

  return (
    <Fields>
      <CodeRow label="Client ID" value={binding.clientId} />
      <ValueRow label="Clean Session" value={binding.cleanSession} />
      <ValueRow label="Keep Alive" value={binding.keepAlive} />
      <SchemaRow
        label="Session Expiry Interval"
        name="sessionExpiryInterval"
        value={binding.sessionExpiryInterval}
      />
      <SchemaRow
        label="Maximum Packet Size"
        name="maximumPacketSize"
        value={binding.maximumPacketSize}
      />
      {lastWill && (
        <GroupRow label="Last Will">
          <CodeRow label="Topic" value={lastWill.topic} />
          <CodeRow label="Quality of Service" value={formatQos(lastWill.qos)} />
          <CodeRow label="Message" value={lastWill.message} />
          <ValueRow label="Retain" value={lastWill.retain} />
        </GroupRow>
      )}
    </Fields>
  );
}

function MqttOperationBinding({ binding }: { binding: MqttOperationBinding }) {
  return (
    <Fields>
      <CodeRow label="Quality of Service" value={formatQos(binding.qos)} />
      <ValueRow label="Retain Flag" value={binding.retain} />
      <SchemaRow
        label="Message Expiry Interval"
        name="messageExpiryInterval"
        value={binding.messageExpiryInterval}
      />
    </Fields>
  );
}

function MqttMessageBinding({ binding }: { binding: MqttMessageBinding }) {
  return (
    <Fields>
      <CodeRow
        label="Payload Format Indicator"
        value={formatPayloadFormatIndicator(binding.payloadFormatIndicator)}
      />
      <SchemaRow label="Correlation Data" name="correlationData" value={binding.correlationData} />
      <CodeRow label="Content Type" value={binding.contentType} />
      {typeof binding.responseTopic === 'object' ? (
        <SchemaRow label="Response Topic" name="responseTopic" value={binding.responseTopic} />
      ) : (
        <CodeRow label="Response Topic" value={binding.responseTopic} />
      )}
    </Fields>
  );
}

export const mqttBinding = createBinding({
  label: 'MQTT',
  Server: MqttServerBinding,
  Operation: MqttOperationBinding,
  Message: MqttMessageBinding,
});
