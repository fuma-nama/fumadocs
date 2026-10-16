import { describe, expect, test } from 'vitest';
import {
  type CodeUsageData,
  createCodeUsageGeneratorRegistry,
  registerDefaultCodeUsages,
  withCodeSamples,
} from '@/codegen';

const registry = registerDefaultCodeUsages(createCodeUsageGeneratorRegistry());
const message: CodeUsageData['message'] = {
  name: 'Light measured',
  contentType: 'application/json',
  headers: { 'my-app-header': 12 },
  payload: { id: 'streetlight-1', lumens: 3, on: true, note: null },
};

const cases: [name: string, data: Omit<CodeUsageData, 'received'>, url?: string][] = [
  [
    'WebSocket',
    {
      protocol: 'wss',
      server: 'wss://api.example.com/v1',
      address: '/lights',
      message,
      bindings: {},
    },
    'wss://api.example.com/v1/lights?api_key=YOUR_API_KEY',
  ],
  [
    'MQTT',
    {
      protocol: 'secure-mqtt',
      server: 'secure-mqtt://broker.example.com',
      address: 'lights/measured',
      message,
      bindings: { operation: { qos: 1, retain: true } },
    },
  ],
  [
    'Kafka',
    {
      protocol: 'kafka-secure',
      server: 'kafka-secure://broker.example.com:9093',
      address: 'lights/measured',
      message,
      bindings: {
        channel: { topic: 'lights.measured' },
        operation: { groupId: { type: 'string', enum: ['lights'] }, clientId: { const: 'app' } },
        message: { key: { type: 'string', examples: ['streetlight-1'] } },
      },
    },
  ],
  [
    'AMQP exchange',
    {
      protocol: 'amqp',
      server: 'amqp://broker.example.com:5672',
      address: 'lights.measured',
      message,
      bindings: {
        channel: { is: 'routingKey', exchange: { name: 'lights', type: 'topic', vhost: 'city' } },
        operation: { ack: true },
      },
    },
  ],
  [
    'AMQP queue',
    {
      protocol: 'amqps',
      server: 'amqps://broker.example.com',
      address: 'lights.measured',
      message,
      bindings: { channel: { is: 'queue', queue: { name: 'measurements' } } },
    },
  ],
  [
    'NATS',
    {
      protocol: 'nats',
      server: 'nats://broker.example.com:4222',
      address: 'lights.measured',
      message,
      bindings: { operation: { queue: 'workers' } },
    },
  ],
];

describe.each(cases)('%s', (_, data, url) => {
  test.each(['js', 'python'])('%s', (id) => {
    const generator = registry.get(id)!;

    expect(generator.generate({ ...data, received: true }, { url })).toMatchSnapshot('receive');
    expect(generator.generate({ ...data, received: false }, { url })).toMatchSnapshot('send');
  });
});

test('unsupported protocols have no samples', () => {
  const data: CodeUsageData = {
    protocol: 'redis',
    server: 'redis://localhost:6379',
    address: 'lights',
    received: true,
    bindings: {},
  };

  for (const generator of registry.map().values()) expect(generator.generate(data, {})).toBe('');
});

test('x-codeSamples of operations', () => {
  const generators = withCodeSamples(registry, {
    action: 'receive',
    channel: {},
    'x-codeSamples': [
      { lang: 'python', source: false },
      { lang: 'js', label: 'SDK', source: 'lights.publish()' },
      { lang: 'go', source: 'package main' },
    ],
  });

  expect(Array.from(generators.map().keys())).toEqual(['js', 'go']);
  expect(generators.get('js')?.label).toBe('SDK');
  expect(generators.get('js')?.generate(cases[0][1] as CodeUsageData, {})).toBe('lights.publish()');
  // the page's generators are kept
  expect(registry.map().size).toBe(2);
});
