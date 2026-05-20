import type { TranslationPreset } from 'fumadocs-core/i18n';
import * as OpenAPI from 'fumadocs-openapi/i18n';
import * as UI from 'fumadocs-ui/i18n';
import * as Story from '@fumadocs/story/i18n';

const ui = {
  displayName: '简体中文',
  search: '搜索',
  searchNoResult: '找不到结果',
  searchOpen: '打开搜索',
  searchClose: '关闭搜索',

  toc: '本页目录',
  tocNoHeadings: '没有标题',
  tocInline: '目录',

  lastUpdate: '最后更新于',
  chooseLanguage: '选择语言',
  nextPage: '下一页',
  previousPage: '上一页',
  chooseTheme: '主题',
  editOnGithub: '在 GitHub 上编辑',

  themeToggle: '切换主题',
  themeLight: '浅色',
  themeDark: '深色',
  themeSystem: '系统',

  codeBlockCopy: '复制文本',
  codeBlockCopied: '已复制文本',

  accordionCopyAnchor: '复制链接',
  headingCopyAnchor: '复制锚点链接',
  bannerClose: '关闭横幅',
  menuToggle: '切换菜单',

  pageActionsCopyMarkdown: '复制 Markdown',
  pageActionsOpen: '打开',
  pageActionsOpenGitHub: '在 GitHub 中打开',
  pageActionsViewMarkdown: '以 Markdown 查看',
  pageActionsOpenScira: '在 Scira AI 中打开',
  pageActionsOpenChatGPT: '在 ChatGPT 中打开',
  pageActionsOpenClaude: '在 Claude 中打开',
  pageActionsOpenCursor: '在 Cursor 中打开',
  pageActionsOpenInLLMPrompt: '阅读 {url}，我想询问相关问题。',

  sidebarOpen: '打开侧边栏',
  sidebarCollapse: '收起侧边栏',

  typeTableProp: '属性',
  typeTableType: '类型',
  typeTableDefault: '默认值',
  typeTableParameters: '参数',
  typeTableReturns: '返回值',

  notFoundTitle: '找不到页面',
  notFoundDescription: '你要查找的页面可能已被移除、名称已更改，或暂时无法使用。',
  notFoundLink: '返回首页',
} satisfies UI.Translations;

const openapi = {
  // General
  loading: '加载中...',
  empty: '空',
  copy: '复制',
  send: '发送',
  authorization: '授权',
  cookies: 'Cookie',
  query: '查询',
  path: '路径',
  header: '标头',
  body: '主体',
  deprecated: '已弃用',
  submit: '提交',
  test: '测试',
  unsupported: '不支持',
  close: '关闭',
  inputPlaceholder: '输入值',

  // Request tabs
  titleRequestTabs: '示例请求',
  requestTabNameDefault: '默认',
  queryParameters: '查询参数',
  pathParameters: '路径参数',
  headerParameters: '标头参数',
  cookieParameters: 'Cookie 参数',

  // Operation sections
  titleRequestBody: '请求主体',
  titleResponseBody: '响应主体',
  titleCallbacks: '回调',

  // Auth scheme
  authBasicTokenExample: 'Basic <token>',
  authBearerTokenExample: 'Bearer <token>',
  openIdConnect: 'OpenID Connect',
  authTokenIn: '位置',
  authScope: '范围',

  // TypeScript panel
  typeScriptDefinitions: 'TypeScript 定义',
  useTypeInTypeScript: '在 TypeScript 中使用 {name} 类型。',

  // Schema info tags
  schemaDefault: '默认',
  schemaMatch: '匹配',
  schemaFormat: '格式',
  schemaMultipleOf: '倍数',
  schemaRange: '范围',
  schemaLength: '长度',
  schemaProperties: '属性',
  schemaItems: '项目',
  schemaValueIn: '值位于',
  schemaExample: '示例',

  // Response tabs
  responseTabName: '示例 {key}',
  responseTabNameDefault: '示例',

  // Playground
  closeJsonEditor: '关闭 JSON 编辑器',
  openJsonEditor: '打开 JSON 编辑器',
  accessToken: '访问令牌',
  authorize: '授权',
  openIdUnsupported: '目前不支持 OpenID Connect，你仍可在此设置访问令牌。',

  // Status info
  statusBadRequest: '错误的请求',
  statusUnauthorized: '未授权',
  statusForbidden: '禁止访问',
  statusNotFound: '找不到',
  statusInternalServerError: '内部服务器错误',
  statusSuccessful: '成功',
  statusError: '错误',
  statusClientError: '客户端错误',
  statusBinaryBody: '二进制响应主体，{length} 字节',

  // OAuth dialog
  oauthFlowPlaceholder: '选择流程',
  obtainAccessToken: '获取 API 的访问令牌。',
  resourceOwnerPassword: '资源所有者密码流程',
  resourceOwnerPasswordDesc: '使用用户名和密码进行验证。',
  clientCredentials: '客户端凭据',
  clientCredentialsDesc: '适用于服务器到服务器验证。',
  authorizationCode: '授权码',
  authorizationCodeDesc: '通过第三方服务进行验证',
  implicit: '隐式',
  implicitDesc: '直接获取访问令牌。',
  deviceAuthorization: '设备授权',
  deviceAuthorizationDesc: '使用设备进行验证。',
  clientId: '客户端 ID',
  clientIdHint: '你的 OAuth 应用程序客户端 ID。',
  clientSecret: '客户端密钥',
  clientSecretHint: '你的 OAuth 应用程序客户端密钥。',
  usernameField: '用户名',
  passwordField: '密码',
  fetchingToken: '正在获取令牌...',
  fetchTokenError: '无法获取令牌',

  // Server select
  serverUrl: '服务器 URL',
  serverUrlDescription: '你的 API 端点基础 URL。',
  serverUrlFieldPlaceholder: '输入值',

  // Schema UI
  schemaShowArray: '数组项目',
  schemaHideArray: '数组项目',
  schemaFilterPropertiesPlaceholder: '筛选属性',
  schemaFilterPropertiesEmpty: '没有匹配的属性',

  // Inputs (playground)
  playgroundShowProperty: '显示属性',
  playgroundPropertyPlaceholder: '输入属性名称',
  playgroundNewProperty: '新增',
  playgroundNewItem: '新增项目',
  playgroundRemoveItem: '移除项目',
  playgroundSelectPlaceholder: '选择',
  playgroundSelected: '已选择',
  playgroundInputUpload: '上传',
  playgroundInputUnset: '取消设置',
} satisfies OpenAPI.Translations;

const story = {
  noVariant: '没有变体',
  props: '属性',
  renderError: '渲染组件时发生错误。',
  reset: '重置',
  unset: '取消设置',
  booleanTrue: '是',
  booleanFalse: '否',
  dateInputPlaceholder: '输入日期',
  numberInputPlaceholder: '输入数字',
  bigintInputPlaceholder: '输入 bigint',
  textInputPlaceholder: '输入文本',
  arrayInputRemoveItem: '移除项目',
  arrayInputAddItem: '新增项目',
} satisfies Story.Translations;

/**
 * Simplified Chinese
 */
export function zhCN<Language extends string>(
  locale: Language,
): TranslationPreset<
  Language,
  {
    ui: UI.Translations;
    openapi: OpenAPI.Translations;
    story: Story.Translations;
  }
> {
  return {
    language: locale,
    value: {
      ui,
      openapi,
      story,
    },
  };
}
