'use client';
import {
  type DependencyList,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { highlight, type HighlightOptions } from '@/server/shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import type { RegexEngine } from 'shiki';

let jsEngine: RegexEngine | undefined;

export function useShiki(
  code: string,
  options: HighlightOptions & {
    defaultValue?: ReactNode;
  },
  deps?: DependencyList,
): ReactNode {
  const [out, setOut] = useState<ReactNode>(() => {
    if (options.defaultValue) return options.defaultValue;

    const { pre: Pre = 'pre', code: Code = 'code' } = options.components ?? {};
    return (
      <Pre>
        <Code>{code}</Code>
      </Pre>
    );
  });

  if (!options.engine && !jsEngine) {
    jsEngine = createJavaScriptRegexEngine();
  }

  useEffect(
    () => {
      void highlight(code, {
        ...options,
        engine: options.engine ?? jsEngine,
      }).then(setOut);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- custom deps
    deps ?? [code, options.lang],
  );

  return out;
}
