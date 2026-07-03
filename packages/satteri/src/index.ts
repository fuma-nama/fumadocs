import '@/data-map';

export {
  defineMdastPlugin,
  defineHastPlugin,
  mdxToJs,
  markdownToHtml,
  evaluate,
  markdownToMdast,
  mdxToMdast,
} from 'satteri';

export type {
  CompileOptions,
  MdxCompileOptions,
  MdxOnlyOptions,
  MdastPluginInput,
  HastPluginInput,
  Features,
  Frontmatter,
  MarkdownToHtmlResult,
  MdxToJsResult,
  Data,
  MdastNode,
  MdastContent,
  MdastVisitorContext,
  HastVisitorContext,
} from 'satteri';

export { applySatteriPreset } from '@/preset';
export type { DefaultSatteriOptions, SatteriPresetOptions } from '@/preset';
export { compileMdx } from '@/compile';
export type { CompileMdxOptions, CompileMdxResult } from '@/compile';

export { remarkHeading, type RemarkHeadingOptions } from '@/remark-heading';
export { remarkStructure, type StructureOptions } from '@/remark-structure';
export type { StructuredData } from '@/remark-structure';
export { remarkImage, type RemarkImageOptions } from '@/remark-image';
export { remarkCodeTab, type RemarkCodeTabOptions } from '@/remark-code-tab';
export { remarkNpm, type RemarkNpmOptions } from '@/remark-npm';
export { remarkTs2js, type RemarkTs2jsOptions } from '@/remark-ts2js';
export { remarkAutoTypeTable, type RemarkAutoTypeTableOptions } from '@/remark-auto-type-table';
export { remarkBlockId, type RemarkBlockIdOptions } from '@/remark-block-id';
export { remarkAdmonition, type RemarkAdmonitionOptions } from '@/remark-admonition';
export {
  remarkDirectiveAdmonition,
  type RemarkDirectiveAdmonitionOptions,
} from '@/remark-directive-admonition';
export { remarkSteps, type RemarkStepsOptions } from '@/remark-steps';
export { remarkMdxMermaid, type RemarkMdxMermaidOptions } from '@/remark-mdx-mermaid';
export { remarkFeedbackBlock, type RemarkFeedbackBlockOptions } from '@/remark-feedback-block';
export { rehypeToc, type RehypeTocOptions } from '@/rehype-toc';
export { rehypeCode, type RehypeCodeOptions } from '@/rehype-code';
export { remarkLlms, type LLMsOptions } from '@/remark-llms';

export { flattenNode, handleTag } from '@/utils';
export { appendExports, queueDataExport, queueTocJsxExport } from '@/inject-exports';
export type { TocJsxExportItem } from '@/data-map';
