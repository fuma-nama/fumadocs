import type { BindingProtocol } from '@/types/asyncapi-3';
import {
  createBinding,
  DestinationChannelBinding,
  HeadersMessageBinding,
  type ProtocolBindingDefinition,
} from '../shared';
import { amqpBinding } from './amqp';
import { googlepubsubBinding } from './googlepubsub';
import { httpBinding } from './http';
import { ibmmqBinding } from './ibmmq';
import { jmsBinding } from './jms';
import { kafkaBinding } from './kafka';
import { mqttBinding } from './mqtt';
import { mqtt5Binding } from './mqtt5';
import { natsBinding } from './nats';
import { pulsarBinding } from './pulsar';
import { ros2Binding } from './ros2';
import { snsBinding } from './sns';
import { solaceBinding } from './solace';
import { sqsBinding } from './sqs';
import { UnknownBinding } from './unknown';
import { wsBinding } from './ws';

const protocolBindings = {
  kafka: kafkaBinding,
  amqp: amqpBinding,
  amqp1: createBinding({ label: 'AMQP 1.0' }),
  http: httpBinding,
  ws: wsBinding,
  mqtt: mqttBinding,
  mqtt5: mqtt5Binding,
  nats: natsBinding,
  anypointmq: createBinding({
    label: 'Anypoint MQ',
    Channel: DestinationChannelBinding,
    Message: HeadersMessageBinding,
  }),
  googlepubsub: googlepubsubBinding,
  ibmmq: ibmmqBinding,
  jms: jmsBinding,
  sns: snsBinding,
  sqs: sqsBinding,
  solace: solaceBinding,
  pulsar: pulsarBinding,
  stomp: createBinding({ label: 'STOMP' }),
  redis: createBinding({ label: 'Redis' }),
  mercure: createBinding({ label: 'Mercure' }),
  ros2: ros2Binding,
} satisfies Record<BindingProtocol, ProtocolBindingDefinition>;

/** unknown protocols show their bindings as JSON */
export function getProtocolBinding(protocol: string): ProtocolBindingDefinition {
  const definition = protocolBindings[protocol as never];
  if (definition) return definition;

  return {
    label: protocol,
    Server: UnknownBinding,
    Channel: UnknownBinding,
    Operation: UnknownBinding,
    Message: UnknownBinding,
  };
}
