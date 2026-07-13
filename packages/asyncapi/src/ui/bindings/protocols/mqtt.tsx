'use client';
import type {
  MqttMessageBinding,
  MqttOperationBinding,
  MqttServerBinding,
} from '@/types/asyncapi-3';
import {
  createBinding,
  hasBindingFields,
  BindingFields,
  BindingEmpty,
  BindingGroup,
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

function getMqttServerSummary(binding: MqttServerBinding): string | undefined {
  return joinBindingSummary(binding.clientId, binding.lastWill?.topic);
}

function getMqttOperationSummary(binding: MqttOperationBinding): string | undefined {
  return joinBindingSummary(
    binding.qos !== undefined && formatQos(binding.qos),
    binding.retain && 'retain',
  );
}

function getMqttMessageSummary(binding: MqttMessageBinding): string | undefined {
  return binding.contentType;
}

function MqttServerBinding({ binding }: { binding: MqttServerBinding }) {
  if (!hasBindingFields(binding)) return <BindingEmpty />;

  return (
    <BindingFields>
      {binding.clientId && (
        <BindingFieldRow
          label="Client ID"
          value={<code className="text-xs">{binding.clientId}</code>}
        />
      )}
      {binding.cleanSession !== undefined && (
        <BindingFieldRow
          label="Clean Session"
          value={<BindingScalarValue value={binding.cleanSession} />}
        />
      )}
      {binding.keepAlive !== undefined && (
        <BindingFieldRow
          label="Keep Alive"
          value={<BindingScalarValue value={binding.keepAlive} />}
        />
      )}
      {binding.sessionExpiryInterval !== undefined && (
        <BindingFieldRow
          label="Session Expiry Interval"
          value={
            typeof binding.sessionExpiryInterval === 'object' ? (
              <BindingSchema name="sessionExpiryInterval" schema={binding.sessionExpiryInterval} />
            ) : (
              <BindingScalarValue value={binding.sessionExpiryInterval} />
            )
          }
        />
      )}
      {binding.maximumPacketSize !== undefined && (
        <BindingFieldRow
          label="Maximum Packet Size"
          value={
            typeof binding.maximumPacketSize === 'object' ? (
              <BindingSchema name="maximumPacketSize" schema={binding.maximumPacketSize} />
            ) : (
              <BindingScalarValue value={binding.maximumPacketSize} />
            )
          }
        />
      )}
      {binding.lastWill && (
        <BindingFieldRow
          label="Last Will"
          value={
            <BindingGroup>
              <BindingFields>
                {binding.lastWill.topic && (
                  <BindingFieldRow
                    label="Topic"
                    value={<code className="text-xs">{binding.lastWill.topic}</code>}
                  />
                )}
                {binding.lastWill.qos !== undefined && (
                  <BindingFieldRow
                    label="Quality of Service"
                    value={<code className="text-xs">{formatQos(binding.lastWill.qos)}</code>}
                  />
                )}
                {binding.lastWill.message && (
                  <BindingFieldRow
                    label="Message"
                    value={<code className="text-xs">{binding.lastWill.message}</code>}
                  />
                )}
                {binding.lastWill.retain !== undefined && (
                  <BindingFieldRow
                    label="Retain"
                    value={<BindingScalarValue value={binding.lastWill.retain} />}
                  />
                )}
              </BindingFields>
            </BindingGroup>
          }
        />
      )}
    </BindingFields>
  );
}

function MqttOperationBinding({ binding }: { binding: MqttOperationBinding }) {
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

function MqttMessageBinding({ binding }: { binding: MqttMessageBinding }) {
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
  Server: MqttServerBinding,
  Operation: MqttOperationBinding,
  Message: MqttMessageBinding,
  getServerSummary: getMqttServerSummary,
  getOperationSummary: getMqttOperationSummary,
  getMessageSummary: getMqttMessageSummary,
});
