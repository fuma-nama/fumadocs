import type { TranslationsAPIExtension, TranslationValue } from 'fumadocs-core/i18n';
import { defaultTranslations as apiDocsTranslations } from '@fumadocs/api-docs/i18n';

export const defaultTranslations = {
  ...apiDocsTranslations,

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
  test: 'Test',
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
  useTypeInTypeScript: 'Use the {name} type in TypeScript.' as TranslationValue<'name'>,

  // Response tabs
  responseTabName: 'Example {key}' as TranslationValue<'key'>,
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
  statusClientError: 'Client Error',
  statusBinaryBody: 'Binary response body, {length} bytes' as TranslationValue<'length'>,

  // OAuth dialog
  oauthFlowPlaceholder: 'Select a flow',
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
  fetchTokenError: 'Failed to fetch token',

  // Server select
  serverUrl: 'Server URL',
  serverUrlDescription: 'The base URL of your API endpoint.',
  serverUrlFieldPlaceholder: 'Enter Value',
};

export type Translations = typeof defaultTranslations;

export function openapiTranslations(): TranslationsAPIExtension<'openapi', Translations> {
  return {
    namespace: 'openapi',
    defaultValue: defaultTranslations,
  };
}
