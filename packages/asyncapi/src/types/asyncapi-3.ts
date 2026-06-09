/** From https://github.com/asyncapi/parser-js/blob/master/packages/parser/src/spec-types/v3.ts
 * - Switched from `json-schema` to `json-schema-typed`
 */
import type { JSONSchema } from 'json-schema-typed/draft-07';

export type AsyncAPIVersion = string;
export type Identifier = string;
export type DefaultContentType = string;

export interface AsyncAPIObject extends SpecificationExtensions {
  asyncapi: AsyncAPIVersion;
  id?: Identifier;
  defaultContentType?: DefaultContentType;
  info: InfoObject;
  servers?: ServersObject;
  channels?: ChannelsObject;
  operations?: OperationsObject;
  components?: ComponentsObject;
}

export interface InfoObject extends SpecificationExtensions {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: ContactObject;
  license?: LicenseObject;
  tags?: TagsObject;
  externalDocs?: ExternalDocumentationObject | ReferenceObject;
}

export interface ContactObject extends SpecificationExtensions {
  name?: string;
  url?: string;
  email?: string;
}

export interface LicenseObject extends SpecificationExtensions {
  name: string;
  url?: string;
}

export type ServersObject = Record<string, ServerObject | ReferenceObject>;

export interface ServerObject extends SpecificationExtensions {
  host: string;
  protocol: string;
  pathname?: string;
  protocolVersion?: string;
  description?: string;
  variables?: Record<string, ServerVariableObject | ReferenceObject>;
  security?: Array<SecuritySchemeObject | ReferenceObject>;
  tags?: TagsObject;
  externalDocs?: ExternalDocumentationObject | ReferenceObject;
  bindings?: ServerBindingsObject | ReferenceObject;
}

export interface ServerVariableObject extends SpecificationExtensions {
  enum?: Array<string>;
  default?: string;
  description?: string;
  examples?: Array<string>;
}

export type ChannelsObject = Record<string, ChannelObject | ReferenceObject>;

export interface ChannelObject extends SpecificationExtensions {
  address?: string | null;
  messages?: MessagesObject;
  title?: string;
  summary?: string;
  description?: string;
  servers?: Array<ServerObject | ReferenceObject>;
  parameters?: ParametersObject;
  tags?: TagsObject;
  externalDocs?: ExternalDocumentationObject | ReferenceObject;
  bindings?: ChannelBindingsObject | ReferenceObject;
}

export type OperationsObject = Record<string, OperationObject | ReferenceObject>;

export interface OperationObject extends SpecificationExtensions {
  action: 'send' | 'receive';
  channel: ChannelObject | ReferenceObject;
  messages?: Array<MessageObject | ReferenceObject>;
  reply?: OperationReplyObject | ReferenceObject;
  title?: string;
  summary?: string;
  description?: string;
  security?: Array<SecuritySchemeObject | ReferenceObject>;
  tags?: TagsObject;
  externalDocs?: ExternalDocumentationObject | ReferenceObject;
  bindings?: OperationBindingsObject | ReferenceObject;
  traits?: Array<OperationTraitObject | ReferenceObject>;
}

export interface OperationTraitObject extends SpecificationExtensions {
  title?: string;
  summary?: string;
  description?: string;
  security?: Array<SecuritySchemeObject | ReferenceObject>;
  tags?: TagsObject;
  externalDocs?: ExternalDocumentationObject | ReferenceObject;
  bindings?: OperationBindingsObject | ReferenceObject;
}

export interface OperationReplyObject extends SpecificationExtensions {
  channel?: ChannelObject | ReferenceObject;
  messages?: (MessageObject | ReferenceObject)[];
  address?: OperationReplyAddressObject | ReferenceObject;
}

export interface OperationReplyAddressObject extends SpecificationExtensions {
  location: string;
  description?: string;
}

export type MessagesObject = Record<string, MessageObject | ReferenceObject>;

export interface MessageObject extends MessageTraitObject, SpecificationExtensions {
  /** JSON Schema (or multi-format wrapper) describing the message body — same shape as `headers`. */
  payload?: MultiFormatSchemaObject;
  traits?: Array<MessageTraitObject | ReferenceObject>;
}

export interface MessageTraitObject extends SpecificationExtensions {
  headers?: MultiFormatSchemaObject;
  correlationId?: CorrelationIDObject | ReferenceObject;
  contentType?: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  tags?: TagsObject;
  externalDocs?: ExternalDocumentationObject | ReferenceObject;
  bindings?: MessageBindingsObject | ReferenceObject;
  examples?: Array<MessageExampleObject>;
}

export interface MessageExampleObject extends SpecificationExtensions {
  name?: string;
  summary?: string;
  /** Concrete header values for this example (not a schema). */
  headers?: Record<string, unknown>;
  /** Concrete payload value for this example (not a schema). */
  payload?: unknown;
}

export type ParametersObject = Record<string, ParameterObject | ReferenceObject>;

export interface ParameterObject extends SpecificationExtensions {
  description?: string;
  enum?: string[];
  default?: string;
  examples?: string[];
  location?: string;
}

export type TagsObject = Array<TagObject | ReferenceObject>;

export interface TagObject extends SpecificationExtensions {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentationObject | ReferenceObject;
}

export interface ExternalDocumentationObject extends SpecificationExtensions {
  url: string;
  description?: string;
}

export interface ComponentsObject extends SpecificationExtensions {
  servers?: Record<string, ServerObject | ReferenceObject>;
  channels?: Record<string, ChannelObject | ReferenceObject>;
  operations?: Record<string, OperationObject | ReferenceObject>;
  messages?: Record<string, MessageObject | ReferenceObject>;
  schemas?: Record<string, SchemaObject | ReferenceObject>;
  securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>;
  serverVariables?: Record<string, ServerVariableObject | ReferenceObject>;
  parameters?: Record<string, ParameterObject | ReferenceObject>;
  replies?: Record<string, OperationReplyObject | ReferenceObject>;
  replyAddresses?: Record<string, OperationReplyAddressObject | ReferenceObject>;
  correlationIds?: Record<string, CorrelationIDObject | ReferenceObject>;
  operationTraits?: Record<string, OperationTraitObject | ReferenceObject>;
  messageTraits?: Record<string, MessageTraitObject | ReferenceObject>;
  tags?: Record<string, TagObject | ReferenceObject>;
  externalDocs?: Record<string, ExternalDocumentationObject | ReferenceObject>;
  serverBindings?: Record<string, ServerBindingsObject | ReferenceObject>;
  channelBindings?: Record<string, ChannelBindingsObject | ReferenceObject>;
  operationBindings?: Record<string, OperationBindingsObject | ReferenceObject>;
  messageBindings?: Record<string, MessageBindingsObject | ReferenceObject>;
}

export interface SecuritySchemeObject extends SpecificationExtensions {
  type: SecuritySchemeType;
  description?: string;
  name?: string;
  in?: 'user' | 'password' | 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlowsObject;
  openIdConnectUrl?: string;
  scopes?: string[];
}

export type SecuritySchemeType =
  | 'userPassword'
  | 'apiKey'
  | 'X509'
  | 'symmetricEncryption'
  | 'asymmetricEncryption'
  | 'httpApiKey'
  | 'http'
  | 'oauth2'
  | 'openIdConnect'
  | 'plain'
  | 'scramSha256'
  | 'scramSha512'
  | 'gssapi';

export type SecuritySchemaLocation = 'user' | 'password' | 'query' | 'header' | 'cookie';

export interface SecuritySchemeObjectBase extends SpecificationExtensions {
  description?: string;
}

export interface SecuritySchemeObjectUserPassword
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'userPassword';
}

export interface SecuritySchemeObjectApiKey
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'apiKey';
  in: 'user' | 'password';
}

export interface SecuritySchemeObjectX509
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'X509';
}

export interface SecuritySchemeObjectSymetricEncryption
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'symmetricEncryption';
}

export interface SecuritySchemeObjectAsymetricEncryption
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'asymmetricEncryption';
}

export interface SecuritySchemeObjectHttpApiKey
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'httpApiKey';
  name: string;
  in: 'query' | 'header' | 'cookie';
}

export interface SecuritySchemeObjectHttp
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'http';
  scheme: string;
  bearerFormat?: string;
}

export interface SecuritySchemeObjectOauth2
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'oauth2';
  flows: OAuthFlowsObject;
  scopes: string[];
}

export interface SecuritySchemeObjectOpenIdConnect
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'openIdConnect';
  openIdConnectUrl: string;
}

export interface SecuritySchemeObjectPlain
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'plain';
}

export interface SecuritySchemeObjectScramSha256
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'scramSha256';
}

export interface SecuritySchemeObjectScramSha512
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'scramSha512';
}

export interface SecuritySchemeObjectGssapi
  extends SecuritySchemeObjectBase, SpecificationExtensions {
  type: 'gssapi';
}

export interface OAuthFlowsObject extends SpecificationExtensions {
  implicit?: OAuthFlowObjectImplicit;
  password?: OAuthFlowObjectPassword;
  clientCredentials?: OAuthFlowObjectClientCredentials;
  authorizationCode?: OAuthFlowObjectAuthorizationCode;
}

export type OAuthFlowObject = OAuthFlowObjectImplicit &
  OAuthFlowObjectPassword &
  OAuthFlowObjectClientCredentials &
  OAuthFlowObjectAuthorizationCode;

export interface OAuthFlowObjectBase extends SpecificationExtensions {
  refreshUrl?: string;
  availableScopes: Record<string, string>;
}

export interface OAuthFlowObjectImplicit extends OAuthFlowObjectBase, SpecificationExtensions {
  authorizationUrl: string;
}

export interface OAuthFlowObjectPassword extends OAuthFlowObjectBase, SpecificationExtensions {
  tokenUrl: string;
}

export interface OAuthFlowObjectClientCredentials
  extends OAuthFlowObjectBase, SpecificationExtensions {
  tokenUrl: string;
}

export interface OAuthFlowObjectAuthorizationCode
  extends OAuthFlowObjectBase, SpecificationExtensions {
  authorizationUrl: string;
  tokenUrl: string;
}

export type SchemaObject = AsyncAPISchemaObject | ReferenceObject;
export type AsyncAPISchemaObject =
  | (Exclude<JSONSchema, boolean> & {
      discriminator?: string;
      externalDocs?: ExternalDocumentationObject;
    })
  | boolean;
export type MultiFormatObject = { schema: AsyncAPISchemaObject; schemaFormat: string | undefined };
export type MultiFormatSchemaObject = AsyncAPISchemaObject | MultiFormatObject;

// ---------------------------------------------------------------------------
// Protocol bindings — https://github.com/asyncapi/bindings
// ---------------------------------------------------------------------------

type SchemaOrRef = AsyncAPISchemaObject | ReferenceObject;

interface BindingBase extends SpecificationExtensions {
  bindingVersion?: string;
}

export interface KafkaServerBinding extends BindingBase {
  schemaRegistryUrl?: string;
  schemaRegistryVendor?: string;
}

export interface KafkaChannelBinding extends BindingBase {
  topic?: string;
  partitions?: number;
  replicas?: number;
  topicConfiguration?: {
    'cleanup.policy'?: Array<'delete' | 'compact'>;
    'retention.ms'?: number;
    'retention.bytes'?: number;
    'delete.retention.ms'?: number;
    'max.message.bytes'?: number;
    'confluent.key.schema.validation'?: boolean;
    'confluent.key.subject.name.strategy'?: string;
    'confluent.value.schema.validation'?: boolean;
    'confluent.value.subject.name.strategy'?: string;
    [key: string]: unknown;
  };
}

export interface KafkaOperationBinding extends BindingBase {
  groupId?: SchemaOrRef;
  clientId?: SchemaOrRef;
}

export interface KafkaMessageBinding extends BindingBase {
  key?: SchemaOrRef | Record<string, unknown>;
  schemaIdLocation?: 'header' | 'payload';
  schemaIdPayloadEncoding?: string;
  schemaLookupStrategy?: string;
}

export type AmqpServerBinding = BindingBase;

export interface AmqpChannelBinding extends BindingBase {
  is?: 'queue' | 'routingKey';
  exchange?: {
    name?: string;
    type?: 'topic' | 'direct' | 'fanout' | 'default' | 'headers';
    durable?: boolean;
    autoDelete?: boolean;
    vhost?: string;
  };
  queue?: {
    name?: string;
    durable?: boolean;
    exclusive?: boolean;
    autoDelete?: boolean;
    vhost?: string;
  };
}

export interface AmqpOperationBinding extends BindingBase {
  expiration?: number;
  userId?: string;
  cc?: string[];
  priority?: number;
  deliveryMode?: 1 | 2;
  mandatory?: boolean;
  bcc?: string[];
  timestamp?: boolean;
  ack?: boolean;
}

export interface AmqpMessageBinding extends BindingBase {
  contentEncoding?: string;
  messageType?: string;
}

export type Amqp1ServerBinding = BindingBase;
export type Amqp1ChannelBinding = BindingBase;
export type Amqp1OperationBinding = BindingBase;
export type Amqp1MessageBinding = BindingBase;

export type HttpServerBinding = BindingBase;
export type HttpChannelBinding = BindingBase;

export interface HttpOperationBinding extends BindingBase {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE';
  query?: SchemaOrRef;
}

export interface HttpMessageBinding extends BindingBase {
  headers?: SchemaOrRef;
  statusCode?: number;
}

export interface MqttServerBinding extends BindingBase {
  clientId?: string;
  cleanSession?: boolean;
  lastWill?: {
    topic?: string;
    qos?: 0 | 1 | 2;
    message?: string;
    retain?: boolean;
  };
  keepAlive?: number;
  sessionExpiryInterval?: number | SchemaOrRef;
  maximumPacketSize?: number | SchemaOrRef;
}

export interface MqttOperationBinding extends BindingBase {
  qos?: 0 | 1 | 2;
  retain?: boolean;
  messageExpiryInterval?: number | SchemaOrRef;
}

export interface MqttMessageBinding extends BindingBase {
  payloadFormatIndicator?: 0 | 1;
  correlationData?: SchemaOrRef;
  contentType?: string;
  responseTopic?: string | SchemaOrRef;
}

export interface Mqtt5ServerBinding extends BindingBase {
  sessionExpiryInterval?: number | SchemaOrRef;
}

export type MqttChannelBinding = BindingBase;
export type Mqtt5ChannelBinding = BindingBase;
export type Mqtt5OperationBinding = BindingBase;
export type Mqtt5MessageBinding = BindingBase;

export type WsServerBinding = BindingBase;

export interface WsChannelBinding extends BindingBase {
  method?: 'GET' | 'POST';
  query?: SchemaOrRef;
  headers?: SchemaOrRef;
}

export type WsOperationBinding = BindingBase;
export type WsMessageBinding = BindingBase;

export type NatsServerBinding = BindingBase;
export type NatsChannelBinding = BindingBase;

export interface NatsOperationBinding extends BindingBase {
  queue?: string;
}

export type NatsMessageBinding = BindingBase;

export type AnypointmqServerBinding = BindingBase;

export interface AnypointmqChannelBinding extends BindingBase {
  destination?: string;
  destinationType?: 'exchange' | 'queue' | 'fifo-queue';
}

export type AnypointmqOperationBinding = BindingBase;

export interface AnypointmqMessageBinding extends BindingBase {
  headers?: SchemaOrRef;
}

export type GooglepubsubServerBinding = BindingBase;

export interface GooglepubsubChannelBinding extends BindingBase {
  labels?: Record<string, string>;
  messageRetentionDuration?: string;
  messageStoragePolicy?: {
    allowedPersistenceRegions?: string[];
  };
  schemaSettings?: {
    encoding?: string;
    firstRevisionId?: string;
    lastRevisionId?: string;
    name?: string;
  };
}

export type GooglepubsubOperationBinding = BindingBase;

export interface GooglepubsubMessageBinding extends BindingBase {
  attributes?: Record<string, string>;
  orderingKey?: string;
  schema?: {
    name?: string;
  };
}

export interface IbmmqServerBinding extends BindingBase {
  groupId?: string;
  ccdtQueueManagerName?: string;
  cipherSpec?: string;
  multiEndpointServer?: boolean;
  heartBeatInterval?: number;
}

export interface IbmmqChannelBinding extends BindingBase {
  destinationType?: 'queue' | 'topic';
  queue?: {
    objectName?: string;
    isPartitioned?: boolean;
    exclusive?: boolean;
  };
  topic?: {
    string?: string;
    objectName?: string;
    durablePermitted?: boolean;
    lastMsgRetained?: boolean;
  };
  maxMsgLength?: number;
}

export type IbmmqOperationBinding = BindingBase;

export interface IbmmqMessageBinding extends BindingBase {
  type?: 'string' | 'jms' | 'binary';
  headers?: string;
  description?: string;
  expiry?: number;
}

export interface JmsServerBinding extends BindingBase {
  jmsConnectionFactory?: string;
  properties?: Array<{
    name?: string;
    value?: unknown;
  }>;
  clientID?: string;
}

export interface JmsChannelBinding extends BindingBase {
  destination?: string;
  destinationType?: 'queue' | 'fifo-queue';
}

export type JmsOperationBinding = BindingBase;

export interface JmsMessageBinding extends BindingBase {
  headers?: SchemaOrRef;
}

export type SnsServerBinding = BindingBase;

export interface SnsChannelBinding extends BindingBase {
  name?: string;
  ordering?: {
    type?: 'standard' | 'FIFO';
    contentBasedDeduplication?: boolean;
  };
  policy?: {
    statements?: Array<{
      effect?: string;
      principal?: string | Record<string, unknown>;
      action?: string | string[];
      resource?: string | string[];
      condition?: Record<string, unknown> | Record<string, unknown>[];
    }>;
  };
  tags?: Record<string, string>;
}

interface SnsIdentifier {
  url?: string;
  email?: string;
  phone?: string;
  arn?: string;
  name?: string;
}

interface SnsDeliveryPolicy {
  minDelayTarget?: number;
  maxDelayTarget?: number;
  numRetries?: number;
  numNoDelayRetries?: number;
  numMinDelayRetries?: number;
  numMaxDelayRetries?: number;
  backoffFunction?: 'arithmetic' | 'exponential' | 'geometric' | 'linear' | string;
  maxReceivesPerSecond?: number;
}

export interface SnsOperationBinding extends BindingBase {
  topic?: SnsIdentifier;
  consumers?: Array<{
    protocol?: string;
    endpoint?: SnsIdentifier;
    filterPolicy?: Record<string, unknown>;
    filterPolicyScope?: string;
    rawMessageDelivery?: boolean;
    redrivePolicy?: {
      deadLetterQueue?: SnsIdentifier;
      maxReceiveCount?: number;
    };
    deliveryPolicy?: SnsDeliveryPolicy;
    displayName?: string;
  }>;
  deliveryPolicy?: SnsDeliveryPolicy;
}

export type SnsMessageBinding = BindingBase;

export type SqsServerBinding = BindingBase;

interface SqsRedrivePolicy {
  deadLetterQueue?: {
    arn?: string;
    name?: string;
  };
  maxReceiveCount?: number;
}

interface SqsPolicy {
  statements?: Array<{
    effect?: string;
    principal?: string | Record<string, unknown>;
    action?: string | string[];
    resource?: string | string[];
    condition?: Record<string, unknown> | Record<string, unknown>[];
  }>;
}

interface SqsChannelQueue {
  name?: string;
  fifoQueue?: boolean;
  deduplicationScope?: 'messageGroup' | 'queue' | string;
  fifoThroughputLimit?: 'perQueue' | 'perMessageGroupId' | string;
  deliveryDelay?: number;
  visibilityTimeout?: number;
  receiveMessageWaitTime?: number;
  messageRetentionPeriod?: number;
  redrivePolicy?: SqsRedrivePolicy;
  policy?: SqsPolicy;
  tags?: Record<string, string>;
}

export interface SqsChannelBinding extends BindingBase {
  queue?: SqsChannelQueue;
  deadLetterQueue?: SqsChannelQueue;
}

export interface SqsOperationBinding extends BindingBase {
  queues?: Array<{
    name?: string;
    fifoQueue?: boolean;
    deduplicationScope?: 'messageGroup' | 'queue' | string;
    fifoThroughputLimit?: 'perQueue' | 'perMessageGroupId' | string;
    deliveryDelay?: number;
    visibilityTimeout?: number;
    receiveMessageWaitTime?: number;
    messageRetentionPeriod?: number;
    redrivePolicy?: SqsRedrivePolicy;
    policy?: SqsPolicy;
    tags?: Record<string, string>;
  }>;
}

export type SqsMessageBinding = BindingBase;

export interface SolaceServerBinding extends BindingBase {
  msgVpn?: string;
  clientName?: string;
}

export type SolaceChannelBinding = BindingBase;

export interface SolaceOperationBinding extends BindingBase {
  destinations?: Array<{
    bindingVersion?: string;
    destinationType?: 'queue' | 'topic';
    deliveryMode?: 'direct' | 'persistent';
    queue?: {
      name?: string;
      topicSubscriptions?: string[];
      accessType?: 'exclusive' | 'nonexclusive';
      maxMsgSpoolSize?: string;
      maxTtl?: string;
    };
    topic?: {
      topicSubscriptions?: string[];
    };
  }>;
  timeToLive?: number | SchemaOrRef;
  priority?: number | SchemaOrRef;
  dmqEligible?: boolean;
}

export type SolaceMessageBinding = BindingBase;

export interface PulsarServerBinding extends BindingBase {
  tenant?: string;
}

export interface PulsarChannelBinding extends BindingBase {
  namespace?: string;
  persistence?: 'persistent' | 'non-persistent';
  compaction?: number;
  'geo-replication'?: string[];
  retention?: {
    time?: number;
    size?: number;
  };
  ttl?: number;
  deduplication?: boolean;
}

export type PulsarOperationBinding = BindingBase;
export type PulsarMessageBinding = BindingBase;

export type StompServerBinding = BindingBase;
export type StompChannelBinding = BindingBase;
export type StompOperationBinding = BindingBase;
export type StompMessageBinding = BindingBase;

export type RedisServerBinding = BindingBase;
export type RedisChannelBinding = BindingBase;
export type RedisOperationBinding = BindingBase;
export type RedisMessageBinding = BindingBase;

export type MercureServerBinding = BindingBase;
export type MercureChannelBinding = BindingBase;
export type MercureOperationBinding = BindingBase;
export type MercureMessageBinding = BindingBase;

export interface ServerBindingsObject extends SpecificationExtensions {
  http?: HttpServerBinding;
  ws?: WsServerBinding;
  kafka?: KafkaServerBinding;
  anypointmq?: AnypointmqServerBinding;
  amqp?: AmqpServerBinding;
  amqp1?: Amqp1ServerBinding;
  mqtt?: MqttServerBinding;
  mqtt5?: Mqtt5ServerBinding;
  nats?: NatsServerBinding;
  jms?: JmsServerBinding;
  sns?: SnsServerBinding;
  solace?: SolaceServerBinding;
  sqs?: SqsServerBinding;
  stomp?: StompServerBinding;
  redis?: RedisServerBinding;
  mercure?: MercureServerBinding;
  ibmmq?: IbmmqServerBinding;
  googlepubsub?: GooglepubsubServerBinding;
  pulsar?: PulsarServerBinding;
}

export interface ChannelBindingsObject extends SpecificationExtensions {
  http?: HttpChannelBinding;
  ws?: WsChannelBinding;
  kafka?: KafkaChannelBinding;
  anypointmq?: AnypointmqChannelBinding;
  amqp?: AmqpChannelBinding;
  amqp1?: Amqp1ChannelBinding;
  mqtt?: MqttChannelBinding;
  mqtt5?: Mqtt5ChannelBinding;
  nats?: NatsChannelBinding;
  jms?: JmsChannelBinding;
  sns?: SnsChannelBinding;
  solace?: SolaceChannelBinding;
  sqs?: SqsChannelBinding;
  stomp?: StompChannelBinding;
  redis?: RedisChannelBinding;
  mercure?: MercureChannelBinding;
  ibmmq?: IbmmqChannelBinding;
  googlepubsub?: GooglepubsubChannelBinding;
  pulsar?: PulsarChannelBinding;
}

export interface OperationBindingsObject extends SpecificationExtensions {
  http?: HttpOperationBinding;
  ws?: WsOperationBinding;
  kafka?: KafkaOperationBinding;
  anypointmq?: AnypointmqOperationBinding;
  amqp?: AmqpOperationBinding;
  amqp1?: Amqp1OperationBinding;
  mqtt?: MqttOperationBinding;
  mqtt5?: Mqtt5OperationBinding;
  nats?: NatsOperationBinding;
  jms?: JmsOperationBinding;
  sns?: SnsOperationBinding;
  solace?: SolaceOperationBinding;
  sqs?: SqsOperationBinding;
  stomp?: StompOperationBinding;
  redis?: RedisOperationBinding;
  mercure?: MercureOperationBinding;
  ibmmq?: IbmmqOperationBinding;
  googlepubsub?: GooglepubsubOperationBinding;
  pulsar?: PulsarOperationBinding;
}

export interface MessageBindingsObject extends SpecificationExtensions {
  http?: HttpMessageBinding;
  ws?: WsMessageBinding;
  kafka?: KafkaMessageBinding;
  anypointmq?: AnypointmqMessageBinding;
  amqp?: AmqpMessageBinding;
  amqp1?: Amqp1MessageBinding;
  mqtt?: MqttMessageBinding;
  mqtt5?: Mqtt5MessageBinding;
  nats?: NatsMessageBinding;
  jms?: JmsMessageBinding;
  sns?: SnsMessageBinding;
  solace?: SolaceMessageBinding;
  sqs?: SqsMessageBinding;
  stomp?: StompMessageBinding;
  redis?: RedisMessageBinding;
  mercure?: MercureMessageBinding;
  ibmmq?: IbmmqMessageBinding;
  googlepubsub?: GooglepubsubMessageBinding;
  pulsar?: PulsarMessageBinding;
}

export type BindingProtocol = keyof Omit<
  ServerBindingsObject,
  keyof SpecificationExtensions | number | symbol
>;

export interface SpecificationExtensions {
  [extension: `x-${string}`]: unknown;
}

export interface ReferenceObject {
  $ref: string;
}

export interface CorrelationIDObject extends SpecificationExtensions {
  location: string;
  description?: string;
}
