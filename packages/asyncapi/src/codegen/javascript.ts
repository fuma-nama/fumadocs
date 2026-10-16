import { isPlainObject } from 'shared-api/utils/is-plain-object';
import type { NatsOperationBinding } from '@/types';
import { getBindingKey } from '@/utils/server-url';
import type { CodeUsageGenerator } from '.';
import { args, getAmqp, getHeaders, getHost, getKafka, getMqtt } from './utils';

const js = (value: unknown) => JSON.stringify(value);

/** an object literal of the defined entries */
function object(entries: Record<string, unknown>): string | undefined {
  let out = '';
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined) continue;
    const name = /^[a-z_$][\w$]*$/i.test(key) ? key : js(key);
    out += `${out && ', '}${name}: ${isPlainObject(value) ? (object(value) ?? '{}') : js(value)}`;
  }
  if (out) return `{ ${out} }`;
}

export const javascript: CodeUsageGenerator = {
  label: 'JavaScript',
  lang: 'js',
  generate(data, { url }) {
    const { received, address } = data;
    const payload = data.message?.payload;
    const json = !received && payload !== undefined && typeof payload !== 'string';
    const body = json ? 'JSON.stringify(payload)' : js(payload ?? '');
    let imports: string | undefined;
    let code: string;

    switch (getBindingKey(data.protocol)) {
      case 'ws':
        code = `const socket = new WebSocket(${js(url)});\n\n`;
        code += received
          ? `socket.addEventListener("message", (event) => {
  console.log(event.data);
});`
          : `socket.addEventListener("open", () => {
  socket.send(${body});
});`;
        break;
      case 'mqtt': {
        const { qos, retain, secure } = getMqtt(data);
        imports = 'import { connectAsync } from "mqtt";';
        code = `const client = await connectAsync(${js(secure ? `mqtts://${getHost(data)}` : data.server)});\n\n`;
        code += received
          ? `client.on("message", (topic, message) => {
  console.log(message.toString());
});
await client.subscribeAsync(${args(js(address), object({ qos }))});`
          : `await client.publishAsync(${args(js(address), body, object({ qos, retain }))});
await client.endAsync();`;
        break;
      }
      case 'kafka': {
        const { host, topic, ssl, clientId, groupId, key } = getKafka(data);
        imports = 'import { Kafka } from "kafkajs";';
        code = `const kafka = new Kafka(${object({ clientId, brokers: [host], ssl: ssl || undefined })});\n`;
        if (received) {
          code += `const consumer = kafka.consumer(${object({ groupId })});

await consumer.connect();
await consumer.subscribe({ topics: [${js(topic)}] });
await consumer.run({
  eachMessage: async ({ message }) => {
    console.log(message.value.toString());
  },
});`;
        } else {
          const headers = getHeaders(data, true);
          code += `const producer = kafka.producer();

await producer.connect();
await producer.send({
  topic: ${js(topic)},
  messages: [{ ${args(key && `key: ${js(key)}`, `value: ${body}`, headers && `headers: ${object(headers)}`)} }],
});
await producer.disconnect();`;
        }
        break;
      }
      case 'amqp': {
        const { url: broker, exchange, key, ack } = getAmqp(data);
        imports = 'import { connect } from "amqplib";';
        code = `const connection = await connect(${js(broker)});
const channel = await connection.createChannel();

`;
        if (received) {
          if (exchange)
            code += `const { queue } = await channel.assertQueue("", { exclusive: true });
await channel.bindQueue(queue, ${js(exchange)}, ${js(key)});
`;
          code += `await channel.consume(${exchange ? 'queue' : js(key)}, (message) => {
  console.log(message.content.toString());${ack ? '\n  channel.ack(message);' : ''}
}${ack ? '' : ', { noAck: true }'});`;
        } else {
          const options = object({
            contentType: data.message?.contentType,
            headers: getHeaders(data, false),
          });
          // closing the channel first sends what it buffered
          code += `${exchange ? `channel.publish(${js(exchange)}, ` : 'channel.sendToQueue('}${args(js(key), `Buffer.from(${body})`, options)});
await channel.close();
await connection.close();`;
        }
        break;
      }
      case 'nats': {
        const { queue } = (data.bindings.operation ?? {}) as NatsOperationBinding;
        const headers = !received && getHeaders(data, true);
        imports = `import { ${headers ? 'connect, headers' : 'connect'} } from "@nats-io/transport-node";`;
        code = `const nc = await connect({ servers: ${js(data.server)} });\n`;
        if (received) {
          code += `const sub = nc.subscribe(${args(js(address), object({ queue }))});

for await (const message of sub) {
  console.log(message.string());
}`;
        } else {
          if (headers) {
            code += 'const h = headers();\n';
            for (const name in headers) code += `h.set(${js(name)}, ${js(headers[name])});\n`;
          }
          code += `
nc.publish(${args(js(address), body, headers && '{ headers: h }')});
await nc.drain();`;
        }
        break;
      }
      default:
        return '';
    }

    if (json) code = `const payload = ${JSON.stringify(payload, null, 2)};\n\n${code}`;
    return imports ? `${imports}\n\n${code}` : code;
  },
};
