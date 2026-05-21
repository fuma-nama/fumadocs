import type { TranslationPreset } from 'fumadocs-core/i18n';
import * as OpenAPI from 'fumadocs-openapi/i18n';
import * as UI from 'fumadocs-ui/i18n';
import * as Story from '@fumadocs/story/i18n';

const ui = {
  displayName: '繁體中文',
  search: '搜尋',
  searchNoResult: '找不到結果',
  searchOpen: '開啟搜尋',
  searchClose: '關閉搜尋',

  toc: '本頁目錄',
  tocNoHeadings: '沒有標題',
  tocInline: '目錄',

  lastUpdate: '最後更新於',
  chooseLanguage: '選擇語言',
  nextPage: '下一頁',
  previousPage: '上一頁',
  chooseTheme: '主題',
  editOnGithub: '在 GitHub 上編輯',

  themeToggle: '切換主題',
  themeLight: '淺色',
  themeDark: '深色',
  themeSystem: '系統',

  codeBlockCopy: '複製文字',
  codeBlockCopied: '已複製文字',

  accordionCopyAnchor: '複製連結',
  headingCopyAnchor: '複製錨點連結',
  bannerClose: '關閉橫幅',
  menuToggle: '切換選單',

  pageActionsCopyMarkdown: '複製 Markdown',
  pageActionsOpen: '開啟',
  pageActionsOpenGitHub: '在 GitHub 中開啟',
  pageActionsViewMarkdown: '以 Markdown 檢視',
  pageActionsOpenScira: '在 Scira AI 中開啟',
  pageActionsOpenChatGPT: '在 ChatGPT 中開啟',
  pageActionsOpenClaude: '在 Claude 中開啟',
  pageActionsOpenCursor: '在 Cursor 中開啟',
  pageActionsOpenInLLMPrompt: '閱讀 {url}，我想詢問相關問題。',

  sidebarOpen: '開啟側邊欄',
  sidebarCollapse: '收合側邊欄',

  typeTableProp: '屬性',
  typeTableType: '型別',
  typeTableDefault: '預設值',
  typeTableParameters: '參數',
  typeTableReturns: '回傳值',

  notFoundTitle: '找不到頁面',
  notFoundDescription: '你要尋找的頁面可能已被移除、名稱已變更，或暫時無法使用。',
  notFoundLink: '返回首頁',
} satisfies UI.Translations;

const openapi = {
  // General
  loading: '載入中...',
  empty: '空白',
  copy: '複製',
  send: '傳送',
  authorization: '授權',
  cookies: 'Cookie',
  query: '查詢',
  path: '路徑',
  header: '標頭',
  body: '主體',
  deprecated: '已棄用',
  submit: '送出',
  test: '測試',
  unsupported: '不支援',
  close: '關閉',
  inputPlaceholder: '輸入值',

  // Request tabs
  titleRequestTabs: '範例請求',
  requestTabNameDefault: '預設',
  queryParameters: '查詢參數',
  pathParameters: '路徑參數',
  headerParameters: '標頭參數',
  cookieParameters: 'Cookie 參數',

  // Operation sections
  titleRequestBody: '請求主體',
  titleResponseBody: '回應主體',
  titleCallbacks: '回呼',

  // Auth scheme
  authBasicTokenExample: 'Basic <token>',
  authBearerTokenExample: 'Bearer <token>',
  openIdConnect: 'OpenID Connect',
  authTokenIn: '位置',
  authScope: '範圍',

  // TypeScript panel
  typeScriptDefinitions: 'TypeScript 定義',
  useTypeInTypeScript: '在 TypeScript 中使用 {name} 型別。',

  // Schema info tags
  schemaDefault: '預設',
  schemaMatch: '符合',
  schemaFormat: '格式',
  schemaMultipleOf: '倍數',
  schemaRange: '範圍',
  schemaLength: '長度',
  schemaProperties: '屬性',
  schemaItems: '項目',
  schemaValueIn: '值位於',
  schemaExample: '範例',

  // Response tabs
  responseTabName: '範例 {key}',
  responseTabNameDefault: '範例',

  // Playground
  closeJsonEditor: '關閉 JSON 編輯器',
  openJsonEditor: '開啟 JSON 編輯器',
  accessToken: '存取權杖',
  authorize: '授權',
  openIdUnsupported: '目前不支援 OpenID Connect，你仍可在此設定存取權杖。',

  // Status info
  statusBadRequest: '錯誤的請求',
  statusUnauthorized: '未授權',
  statusForbidden: '禁止存取',
  statusNotFound: '找不到',
  statusInternalServerError: '內部伺服器錯誤',
  statusSuccessful: '成功',
  statusError: '錯誤',
  statusClientError: '用戶端錯誤',
  statusBinaryBody: '二進位回應主體，{length} 位元組',

  // OAuth dialog
  oauthFlowPlaceholder: '選擇流程',
  obtainAccessToken: '取得 API 的存取權杖。',
  resourceOwnerPassword: '資源擁有者密碼流程',
  resourceOwnerPasswordDesc: '使用使用者名稱和密碼進行驗證。',
  clientCredentials: '用戶端憑證',
  clientCredentialsDesc: '適用於伺服器對伺服器驗證。',
  authorizationCode: '授權碼',
  authorizationCodeDesc: '透過第三方服務進行驗證',
  implicit: '隱含式',
  implicitDesc: '直接取得存取權杖。',
  deviceAuthorization: '裝置授權',
  deviceAuthorizationDesc: '使用裝置進行驗證。',
  clientId: '用戶端 ID',
  clientIdHint: '你的 OAuth 應用程式用戶端 ID。',
  clientSecret: '用戶端密鑰',
  clientSecretHint: '你的 OAuth 應用程式用戶端密鑰。',
  usernameField: '使用者名稱',
  passwordField: '密碼',
  fetchingToken: '正在取得權杖...',
  fetchTokenError: '無法取得權杖',

  // Server select
  serverUrl: '伺服器 URL',
  serverUrlDescription: '你的 API 端點基礎 URL。',
  serverUrlFieldPlaceholder: '輸入值',

  // Schema UI
  schemaShowArray: '陣列項目',
  schemaHideArray: '陣列項目',
  schemaFilterPropertiesPlaceholder: '篩選屬性',
  schemaFilterPropertiesEmpty: '沒有符合的屬性',

  // Inputs (playground)
  playgroundShowProperty: '顯示屬性',
  playgroundPropertyPlaceholder: '輸入屬性名稱',
  playgroundNewProperty: '新增',
  playgroundNewItem: '新增項目',
  playgroundRemoveItem: '移除項目',
  playgroundSelectPlaceholder: '選擇',
  playgroundSelected: '已選取',
  playgroundInputUpload: '上傳',
  playgroundInputUnset: '取消設定',
} satisfies OpenAPI.Translations;

const story = {
  noVariant: '沒有變體',
  props: '屬性',
  renderError: '渲染元件時發生錯誤。',
  reset: '重設',
  unset: '取消設定',
  booleanTrue: '是',
  booleanFalse: '否',
  dateInputPlaceholder: '輸入日期',
  numberInputPlaceholder: '輸入數字',
  bigintInputPlaceholder: '輸入 bigint',
  textInputPlaceholder: '輸入文字',
  arrayInputRemoveItem: '移除項目',
  arrayInputAddItem: '新增項目',
} satisfies Story.Translations;

/**
 * Traditional Chinese
 */
export function zhTW(): TranslationPreset<{
  ui: UI.Translations;
  openapi: OpenAPI.Translations;
  story: Story.Translations;
}> {
  return {
    name: 'zh-TW',
    value: {
      ui,
      openapi,
      story,
    },
  };
}
