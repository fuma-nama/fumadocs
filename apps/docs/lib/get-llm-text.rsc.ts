import { type Page } from '@/lib/source';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { visit } from 'unist-util-visit';
import { getMDXComponents } from '@/mdx-components';
import * as JsxRuntime from 'react/jsx-runtime';

import { toJs } from 'estree-util-to-js';
import { buildJsx } from 'estree-util-build-jsx';
import type { Program } from 'estree';
import React, { ReactNode } from 'react';
import type { Nodes } from 'hast';

/**
 * Experimental usage of `get-llm-text.rsc`, not working for client components yet.
 *
 * make sure to enable `postprocess.includeMDAST` first.
 *
 * still have to add stringify layer from `remark-mdx`.
 */
export async function getLLMText(page: Page) {
  if (page.data.type === 'openapi') return '';
  const tree = await page.data.getMDAST();
  const tasks: Promise<void>[] = [];

  visit(tree, (node) => {
    if (
      node.type === 'mdxJsxFlowElement' ||
      node.type === 'mdxFlowExpression'
    ) {
      const context = {
        React,
        ...getMDXComponents(),
      };
      const v = toJsxRuntime(node as Nodes, {
        ...JsxRuntime,
        components: getMDXComponents(),
        createEvaluater: () => {
          return {
            evaluateExpression(expression) {
              return evaluateEstreeExpression(
                {
                  type: 'Program',
                  body: [
                    {
                      type: 'ReturnStatement',
                      argument: expression,
                    },
                  ],
                  sourceType: 'module',
                },
                context,
              );
            },
            evaluateProgram(program) {
              return evaluateEstreeExpression(program, context);
            },
          };
        },
        development: false,
      });

      async function task() {
        const value = await renderToString(v).catch(() => '');

        Object.assign(node, {
          type: 'text',
          value,
        });
      }

      tasks.push(task());
    }
  });

  await Promise.all(tasks);
  return JSON.stringify(tree);
}

interface LLMStorage {
  isLLM: boolean;
}

const llmStorage = new AsyncLocalStorage<LLMStorage>({
  name: 'llm-storage',
  defaultValue: {
    isLLM: false,
  },
});

async function renderToString(node: ReactNode): Promise<string> {
  const { renderToReadableStream } = await import('react-dom/server.edge');
  return llmStorage.run({ isLLM: true }, async () => {
    const stream = await renderToReadableStream(node);
    await stream.allReady;

    const res = new Response(stream);
    return res.text();
  });
}

export function isLLM() {
  return llmStorage.getStore()!.isLLM;
}

function evaluateEstreeExpression(astNode: Program, context = {}) {
  buildJsx(astNode);
  const code = toJs(astNode).value;
  const argNames = Object.keys(context);
  const argValues = Object.values(context);
  const evalFn = new Function(...argNames, code);

  return evalFn(...argValues);
}
