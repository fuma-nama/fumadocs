'use client';
import {
  type DependencyList,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { highlight, type HighlightOptions } from '@/server';

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

  useEffect(
    () => {
      void highlight(code, options).then((res) => {
        setOut(res);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- custom deps
    deps ?? [code, options.lang],
  );

  return out;
}
