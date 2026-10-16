import type { NatsOperationBinding } from '@/types';
import { getBindingKey } from '@/utils/server-url';
import type { CodeUsageGenerator } from '.';
import { args, getAmqp, getHeaders, getHost, getKafka, getMqtt } from './utils';

const constants: Record<string, string> = { true: 'True', false: 'False', null: 'None' };

/** the Python literal of a JSON value */
function py(value: unknown): string {
  return JSON.stringify(value, null, 4).replace(
    /("(?:[^"\\]|\\.)*")|true|false|null/g,
    (match, str?: string) => str ?? constants[match],
  );
}

/** keyword arguments of the defined entries */
function kwargs(entries: Record<string, unknown>): string {
  let out = '';
  for (const [key, value] of Object.entries(entries))
    if (value !== undefined) out += `${out && ', '}${key}=${py(value)}`;
  return out;
}

export const python: CodeUsageGenerator = {
  label: 'Python',
  lang: 'python',
  generate(data, { url }) {
    const { received, address } = data;
    const payload = data.message?.payload;
    const json = !received && payload !== undefined && typeof payload !== 'string';
    const body = json ? 'json.dumps(payload)' : py(payload ?? '');
    let imports: string;
    /** the body of `async def main()` */
    let main: string | undefined;
    let code = '';

    switch (getBindingKey(data.protocol)) {
      case 'ws':
        imports = 'from websockets.asyncio.client import connect';
        main = `async with connect(${py(url)}) as websocket:\n`;
        main += received
          ? `    async for message in websocket:
        print(message)`
          : `    await websocket.send(${body})`;
        break;
      case 'mqtt': {
        const { qos, retain, secure } = getMqtt(data);
        const [hostname, port = secure ? '8883' : '1883'] = getHost(data).split(':');
        const connect = `${secure ? 'client.tls_set()\n' : ''}client.connect(${py(hostname)}, ${port})`;
        imports = 'import paho.mqtt.client as mqtt';
        code = received
          ? `
def on_connect(client, userdata, flags, reason_code, properties):
    client.subscribe(${args(py(address), kwargs({ qos }))})


def on_message(client, userdata, message):
    print(message.payload.decode())


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_connect = on_connect
client.on_message = on_message
${connect}
client.loop_forever()`
          : `client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
${connect}
client.loop_start()
client.publish(${args(py(address), body, kwargs({ qos, retain }))}).wait_for_publish()
client.disconnect()
client.loop_stop()`;
        break;
      }
      case 'kafka': {
        const { host, topic, ssl, clientId, groupId, key } = getKafka(data);
        const config = py({
          'bootstrap.servers': host,
          'group.id': received ? groupId : undefined,
          'client.id': clientId,
          'security.protocol': ssl ? 'SSL' : undefined,
        });
        if (received) {
          imports = 'from confluent_kafka import Consumer';
          code = `consumer = Consumer(${config})
consumer.subscribe([${py(topic)}])

while True:
    message = consumer.poll(1.0)
    if message is not None and not message.error():
        print(message.value().decode())`;
        } else {
          imports = 'from confluent_kafka import Producer';
          code = `producer = Producer(${config})
producer.produce(${args(py(topic), body, kwargs({ key, headers: getHeaders(data, true) }))})
producer.flush()`;
        }
        break;
      }
      case 'amqp': {
        const { url: broker, exchange, key, ack } = getAmqp(data);
        const connect = `connection = pika.BlockingConnection(pika.URLParameters(${py(broker)}))
channel = connection.channel()`;
        imports = 'import pika';
        if (received) {
          code = `
def on_message(channel, method, properties, body):
    print(body.decode())${ack ? '\n    channel.basic_ack(method.delivery_tag)' : ''}


${connect}
`;
          if (exchange)
            code += `queue = channel.queue_declare("", exclusive=True).method.queue
channel.queue_bind(queue, ${py(exchange)}, ${py(key)})
`;
          code += `channel.basic_consume(${args(exchange ? 'queue' : py(key), 'on_message', !ack && 'auto_ack=True')})
channel.start_consuming()`;
        } else {
          const properties = kwargs({
            content_type: data.message?.contentType,
            headers: getHeaders(data, false),
          });
          code = `${connect}
channel.basic_publish(${args(py(exchange ?? ''), py(key), body, properties && `pika.BasicProperties(${properties})`)})
connection.close()`;
        }
        break;
      }
      case 'nats': {
        const { queue } = (data.bindings.operation ?? {}) as NatsOperationBinding;
        imports = 'import nats';
        main = `nc = await nats.connect(${py(data.server)})\n`;
        main += received
          ? `sub = await nc.subscribe(${args(py(address), kwargs({ queue }))})
async for message in sub.messages:
    print(message.data.decode())`
          : `await nc.publish(${args(py(address), `${body}.encode()`, kwargs({ headers: getHeaders(data, true) }))})
await nc.drain()`;
        break;
      }
      default:
        return '';
    }

    let out = main ? 'import asyncio\n' : '';
    if (json) out += 'import json\n';
    out += `${out && '\n'}${imports}\n\n`;
    if (json) out += `payload = ${py(payload)}\n\n`;
    if (main) code = `\nasync def main():\n${main.replace(/^/gm, '    ')}\n\n\nasyncio.run(main())`;
    return out + code;
  },
};
