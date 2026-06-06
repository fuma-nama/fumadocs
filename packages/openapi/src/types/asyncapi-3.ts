/** From https://github.com/asyncapi/parser-js/blob/master/packages/parser/src/spec-types/v3.ts
 * - Switched from `json-schema` to `json-schema-typed`
 */
import type { JSONSchema, $schema, TypeName } from 'json-schema-typed/draft-07';

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

export interface ServerBindingsObject extends SpecificationExtensions {
  http?: Binding;
  ws?: Binding;
  kafka?: Binding;
  anypointmq?: Binding;
  amqp?: Binding;
  amqp1?: Binding;
  mqtt?: Binding;
  mqtt5?: Binding;
  nats?: Binding;
  jms?: Binding;
  sns?: Binding;
  sqs?: Binding;
  stomp?: Binding;
  redis?: Binding;
  mercure?: Binding;
  ibmmq?: Binding;
  googlepubsub?: Binding;
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

export interface ChannelBindingsObject extends SpecificationExtensions {
  http?: Binding;
  ws?: Binding;
  kafka?: Binding;
  anypointmq?: Binding;
  amqp?: Binding;
  amqp1?: Binding;
  mqtt?: Binding;
  mqtt5?: Binding;
  nats?: Binding;
  jms?: Binding;
  sns?: Binding;
  sqs?: Binding;
  stomp?: Binding;
  redis?: Binding;
  mercure?: Binding;
  ibmmq?: Binding;
  googlepubsub?: Binding;
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

export interface OperationBindingsObject extends SpecificationExtensions {
  http?: Binding;
  ws?: Binding;
  kafka?: Binding;
  anypointmq?: Binding;
  amqp?: Binding;
  amqp1?: Binding;
  mqtt?: Binding;
  mqtt5?: Binding;
  nats?: Binding;
  jms?: Binding;
  sns?: Binding;
  sqs?: Binding;
  stomp?: Binding;
  redis?: Binding;
  mercure?: Binding;
  ibmmq?: Binding;
  googlepubsub?: Binding;
}

export type MessagesObject = Record<string, MessageObject | ReferenceObject>;

export interface MessageObject extends MessageTraitObject, SpecificationExtensions {
  payload?: any;
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
  headers?: Record<string, any>;
  payload?: any;
}

export interface MessageBindingsObject extends SpecificationExtensions {
  http?: Binding;
  ws?: Binding;
  kafka?: Binding;
  anypointmq?: Binding;
  amqp?: Binding;
  amqp1?: Binding;
  mqtt?: Binding;
  mqtt5?: Binding;
  nats?: Binding;
  jms?: Binding;
  sns?: Binding;
  sqs?: Binding;
  stomp?: Binding;
  redis?: Binding;
  mercure?: Binding;
  ibmmq?: Binding;
  googlepubsub?: Binding;
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
export type AsyncAPISchemaObject = AsyncAPISchemaDefinition | boolean;
export type MultiFormatObject = { schema: AsyncAPISchemaObject; schemaFormat: string | undefined };
export type MultiFormatSchemaObject = AsyncAPISchemaObject | MultiFormatObject;

export interface AsyncAPISchemaDefinition extends SpecificationExtensions {
  $id?: string;
  $schema?: typeof $schema;
  $comment?: string;

  type?: TypeName | TypeName[];
  enum?: JSONSchema[];
  const?: JSONSchema;

  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  maxLength?: number;
  minLength?: number;
  pattern?: string;

  items?: AsyncAPISchemaObject | AsyncAPISchemaObject[];
  additionalItems?: AsyncAPISchemaObject;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  contains?: AsyncAPISchemaObject;

  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  properties?: {
    [key: string]: AsyncAPISchemaObject;
  };
  patternProperties?: {
    [key: string]: AsyncAPISchemaObject;
  };
  additionalProperties?: AsyncAPISchemaObject;
  dependencies?: {
    [key: string]: AsyncAPISchemaObject | string[];
  };
  propertyNames?: AsyncAPISchemaObject;

  if?: AsyncAPISchemaObject;
  then?: AsyncAPISchemaObject;
  else?: AsyncAPISchemaObject;

  allOf?: AsyncAPISchemaObject[];
  anyOf?: AsyncAPISchemaObject[];
  oneOf?: AsyncAPISchemaObject[];
  not?: AsyncAPISchemaObject;

  format?: string;

  contentMediaType?: string;
  contentEncoding?: string;

  definitions?: {
    [key: string]: AsyncAPISchemaObject;
  };

  title?: string;
  description?: string;
  default?: JSONSchema;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: JSONSchema[];

  discriminator?: string;
  externalDocs?: ExternalDocumentationObject;
  deprecated?: boolean;
  [keyword: string]: any;
}

export interface Binding {
  bindingVersion?: string;
}

export interface SpecificationExtensions {
  [extension: `x-${string}`]: SpecificationExtension;
}

export type SpecificationExtension<T = any> = T;

export interface ReferenceObject {
  $ref: string;
}

export interface CorrelationIDObject extends SpecificationExtensions {
  location: string;
  description?: string;
}
