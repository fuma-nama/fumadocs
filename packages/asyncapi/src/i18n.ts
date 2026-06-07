import type { TranslationsAPIExtension, TranslationValue } from 'fumadocs-core/i18n';
import { defaultTranslations as apiDocsTranslations } from '@fumadocs/api-docs/i18n';

export const defaultTranslations = {
  ...apiDocsTranslations,

  loading: 'loading...',
  empty: 'Empty',
  copy: 'Copy',
  send: 'Send',
  receive: 'Receive',
  authorization: 'Authorization',
  deprecated: 'Deprecated',
  close: 'Close',

  titleMessages: 'Messages',
  titleReply: 'Reply',
  titleChannel: 'Channel',
  titleBindings: 'Bindings',
  titleParameters: 'Parameters',
  titleHeaders: 'Headers',
  titlePayload: 'Payload',
  titleServers: 'Servers',
  titleTraits: 'Traits',
  titleCorrelationId: 'Correlation ID',

  channelAddress: 'Address',
  channelMessages: 'Messages',
  serverProtocol: 'Protocol',
  serverHost: 'Host',

  authTokenIn: 'In',
  authScope: 'Scope',
  openIdConnect: 'OpenID Connect',
  authBearerTokenExample: 'Bearer <token>',
  authBasicTokenExample: 'Basic <token>',

  typeScriptDefinitions: 'TypeScript Definitions',
  useTypeInTypeScript: 'Use the {name} type in TypeScript.' as TranslationValue<'name'>,

  messageExample: 'Example {key}' as TranslationValue<'key'>,
  messageExampleDefault: 'Example',
};

export type Translations = typeof defaultTranslations;

export function asyncapiTranslations(): TranslationsAPIExtension<'asyncapi', Translations> {
  return {
    namespace: 'asyncapi',
    defaultValue: defaultTranslations,
  };
}
