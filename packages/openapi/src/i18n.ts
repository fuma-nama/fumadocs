import type { I18nUIConfig } from 'fumadocs-ui/i18n';
import { deepmerge } from '@fastify/deepmerge';
import type { TranslationsOption } from 'fumadocs-ui/contexts/i18n';

export const defaultTranslations = {
  // General
  loading: 'loading...',
  empty: 'Empty',
  copy: 'Copy',
  send: 'Send',
  authorization: 'Authorization',
  cookies: 'Cookies',
  query: 'Query',
  path: 'Path',
  header: 'Header',
  body: 'Body',
  deprecated: 'Deprecated',
  submit: 'Submit',
  unsupported: 'Unsupported',
  close: 'Close',
  inputPlaceholder: 'Enter value',

  // Request tabs
  titleRequestTabs: 'Example Requests',
  requestTabNameDefault: 'Default',
  queryParameters: 'Query Parameters',
  pathParameters: 'Path Parameters',
  headerParameters: 'Header Parameters',
  cookieParameters: 'Cookie Parameters',

  // Operation sections
  titleRequestBody: 'Request Body',
  titleResponseBody: 'Response Body',
  titleCallbacks: 'Callbacks',

  // Auth scheme
  authBasicTokenExample: 'Basic <token>',
  authBearerTokenExample: 'Bearer <token>',
  openIdConnect: 'OpenID Connect',
  authTokenIn: 'In',
  authScope: 'Scope',

  // TypeScript panel
  typeScriptDefinitions: 'TypeScript Definitions',
  useTypeInTypeScript: 'Use the {name} type in TypeScript.',

  // Schema info tags
  schemaDefault: 'Default',
  schemaMatch: 'Match',
  schemaFormat: 'Format',
  schemaMultipleOf: 'Multiple Of',
  schemaRange: 'Range',
  schemaLength: 'Length',
  schemaProperties: 'Properties',
  schemaItems: 'Items',
  schemaValueIn: 'Value in',
  schemaExample: 'Example',

  // Response tabs
  responseTabName: 'Example {key}',
  responseTabNameDefault: 'Example',

  // Playground
  closeJsonEditor: 'Close JSON Editor',
  openJsonEditor: 'Open JSON Editor',
  accessToken: 'Access Token',
  authorize: 'Authorize',
  openIdUnsupported:
    'OpenID Connect is not supported at the moment, you can still set an access token here.',

  // Status info
  statusBadRequest: 'Bad Request',
  statusUnauthorized: 'Unauthorized',
  statusForbidden: 'Forbidden',
  statusNotFound: 'Not Found',
  statusInternalServerError: 'Internal Server Error',
  statusSuccessful: 'Successful',
  statusError: 'Error',
  statusNoDescription: 'No Description',

  // OAuth dialog
  obtainAccessToken: 'Obtain the access token for API.',
  resourceOwnerPassword: 'Resource Owner Password Flow',
  resourceOwnerPasswordDesc: 'Authenticate using username and password.',
  clientCredentials: 'Client Credentials',
  clientCredentialsDesc: 'Intended for the server-to-server authentication.',
  authorizationCode: 'Authorization code',
  authorizationCodeDesc: 'Authenticate with 3rd party services',
  implicit: 'Implicit',
  implicitDesc: 'Retrieve the access token directly.',
  deviceAuthorization: 'Device Authorization',
  deviceAuthorizationDesc: 'Authenticate with device.',
  clientId: 'Client ID',
  clientIdHint: 'The client ID of your OAuth application.',
  clientSecret: 'Client Secret',
  clientSecretHint: 'The client secret of your OAuth application.',
  usernameField: 'Username',
  passwordField: 'Password',
  fetchingToken: 'Fetching token...',

  // Server select
  serverUrl: 'Server URL',
  serverUrlDescription: 'The base URL of your API endpoint.',
  serverUrlFieldPlaceholder: 'Enter Value',

  // Schema UI
  schemaShowArray: 'Array Item',
  schemaHideArray: 'Array Item',
  schemaFilterPropertiesPlaceholder: 'Filter Properties',
  schemaFilterPropertiesEmpty: 'No property matching',

  // Inputs (playground)
  playgroundShowProperty: 'Show Property',
  playgroundPropertyPlaceholder: 'Enter Property Name',
  playgroundNewProperty: 'New',
  playgroundNewItem: 'New Item',
  playgroundRemoveItem: 'Remove Item',
  playgroundSelectPlaceholder: 'Select',
  playgroundSelected: 'Selected',
  playgroundInputUpload: 'Upload',
  playgroundInputUnset: 'Unset',
};

export type Translations = typeof defaultTranslations;

export function defineI18nOpenAPI<Languages extends string>(
  config: I18nUIConfig<Languages>,
  translations: Partial<Record<NoInfer<Languages>, Partial<Translations>>>,
): I18nUIConfig<Languages> {
  const dm = deepmerge();
  return {
    ...config,
    provider(locale = config.defaultLanguage) {
      const out = config.provider(locale);
      const data = translations[locale as Languages];
      if (data) {
        out.translations ??= {};
        out.translations.openapi = dm(defaultTranslations, data) as TranslationsOption;
      }
      return out;
    },
  };
}
