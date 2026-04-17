import type * as JsxRuntime from 'react/jsx-runtime';
import type { Expression, Program } from 'estree-jsx';

export interface JSExecutor {
  program: (program: Program, context: Record<string, unknown>) => unknown;
  expression: (expression: Expression, context: Record<string, unknown>) => unknown;
  /**
   * get all exports in executed program/statements
   */
  getExports: () => Record<string, unknown>;
}

export interface JSExecutorConfig {
  jsx: typeof JsxRuntime;
  filePath: string;
}
