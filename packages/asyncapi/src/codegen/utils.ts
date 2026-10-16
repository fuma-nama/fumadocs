import { dereference, type JsonSchema } from '@fumadocs/json-schema';
import { isPlainObject } from 'shared-api/utils/is-plain-object';
import type {
  AmqpChannelBinding,
  AmqpOperationBinding,
  KafkaChannelBinding,
  KafkaMessageBinding,
  KafkaOperationBinding,
  MqttOperationBinding,
} from '@/types';
import type { CodeUsageData } from '.';

/** the arguments of a call, empty ones are left out */
export function args(...items: (string | false | undefined)[]): string {
  let out = '';
  for (const item of items) if (item) out += out ? `, ${item}` : item;
  return out;
}

/** `host:port` of the server */
export function getHost({ protocol, server }: CodeUsageData): string {
  return server.slice(protocol.length + 3);
}

/** a value from a schema of bindings, like the group ID of Kafka consumers */
function getValue(schema: unknown): string | undefined {
  const s = dereference(schema) as Exclude<JsonSchema, boolean> | undefined;
  const value = s?.const ?? s?.enum?.[0] ?? s?.default ?? s?.examples?.[0];
  if (value !== undefined) return typeof value === 'string' ? value : JSON.stringify(value);
}

/** headers of the example message, `strings` for protocols with string values */
export function getHeaders(
  { message }: CodeUsageData,
  strings: boolean,
): Record<string, unknown> | undefined {
  const headers = message?.headers;
  if (!isPlainObject(headers)) return;
  let out: Record<string, unknown> | undefined;
  for (const [key, value] of Object.entries(headers))
    (out ??= {})[key] = strings && typeof value !== 'string' ? JSON.stringify(value) : value;
  return out;
}

export function getMqtt({ protocol, bindings }: CodeUsageData) {
  const { qos, retain } = (bindings.operation ?? {}) as MqttOperationBinding;
  return { qos, retain, secure: protocol !== 'mqtt' };
}

export function getKafka(data: CodeUsageData) {
  const { groupId, clientId } = (data.bindings.operation ?? {}) as KafkaOperationBinding;
  return {
    host: getHost(data),
    topic: (data.bindings.channel as KafkaChannelBinding | undefined)?.topic ?? data.address,
    ssl: data.protocol === 'kafka-secure',
    clientId: getValue(clientId),
    groupId: getValue(groupId) ?? 'my-group',
    key: getValue((data.bindings.message as KafkaMessageBinding | undefined)?.key),
  };
}

export function getAmqp({ server, address, bindings }: CodeUsageData) {
  const { is, exchange, queue } = (bindings.channel ?? {}) as AmqpChannelBinding;
  const vhost = exchange?.vhost ?? queue?.vhost;
  const name = is !== 'queue' && exchange?.type !== 'default' ? exchange?.name : undefined;

  return {
    url: vhost && vhost !== '/' ? `${server}/${encodeURIComponent(vhost)}` : server,
    exchange: name,
    /** the routing key with an exchange, otherwise the queue */
    key: name ? address : (queue?.name ?? address),
    ack: (bindings.operation as AmqpOperationBinding | undefined)?.ack,
  };
}
