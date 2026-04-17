import { ExpressionSync } from '@/eval-estree-expression';
import type { JSExecutor, JSExecutorConfig } from './executor';

/**
 * Execute JavaScript with a faked JS engine, limited features but works on workerd.
 */
export function executorVirtual(options: JSExecutorConfig): JSExecutor {
  const sync = new ExpressionSync(options);

  return {
    expression(expression, context) {
      return sync.evaluate(expression, context);
    },
    program(expression, context) {
      return sync.evaluate(expression, context);
    },
    getExports() {
      return sync.getExports();
    },
  };
}
