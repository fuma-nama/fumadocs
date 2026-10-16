import type { BindingProtocol } from '@/types/asyncapi-3';
import type { ProtocolBindingDefinition } from '../shared';
import { amqpBinding } from './amqp';
import { amqp1Binding } from './amqp1';
import { anypointmqBinding } from './anypointmq';
import { googlepubsubBinding } from './googlepubsub';
import { httpBinding } from './http';
import { ibmmqBinding } from './ibmmq';
import { jmsBinding } from './jms';
import { kafkaBinding } from './kafka';
import { mercureBinding } from './mercure';
import { mqttBinding } from './mqtt';
import { mqtt5Binding } from './mqtt5';
import { natsBinding } from './nats';
import { pulsarBinding } from './pulsar';
import { redisBinding } from './redis';
import { ros2Binding } from './ros2';
import { snsBinding } from './sns';
import { solaceBinding } from './solace';
import { sqsBinding } from './sqs';
import { stompBinding } from './stomp';
import { unknownBinding } from './unknown';
import { wsBinding } from './ws';

export const protocolBindings = {
  kafka: kafkaBinding,
  amqp: amqpBinding,
  amqp1: amqp1Binding,
  http: httpBinding,
  ws: wsBinding,
  mqtt: mqttBinding,
  mqtt5: mqtt5Binding,
  nats: natsBinding,
  anypointmq: anypointmqBinding,
  googlepubsub: googlepubsubBinding,
  ibmmq: ibmmqBinding,
  jms: jmsBinding,
  sns: snsBinding,
  sqs: sqsBinding,
  solace: solaceBinding,
  pulsar: pulsarBinding,
  stomp: stompBinding,
  redis: redisBinding,
  mercure: mercureBinding,
  ros2: ros2Binding,
} satisfies Record<BindingProtocol, ProtocolBindingDefinition>;

export function getProtocolBinding(protocol: string): ProtocolBindingDefinition {
  const v = protocolBindings[protocol as never];
  if (v) return v;

  return {
    ...unknownBinding,
    label: protocol,
  };
}
