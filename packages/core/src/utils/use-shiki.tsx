'use client';
import {
  type DependencyList,
  type ReactNode,
  use,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  _highlight,
  _renderHighlight,
  highlight,
  type HighlightOptions,
} from '@/utils/shiki';
import type { RegexEngine } from 'shiki';
import type { Root } from 'hast';

let jsEngine: Promise<RegexEngine> | undefined;

function getHighlightOptions(from: HighlightOptions): HighlightOptions {
  if (from.engine) return from;

  if (!jsEngine) {
    jsEngine = import('shiki/engine/javascript').then((res) =>
      res.createJavaScriptRegexEngine(),
    );
  }

  return {
    ...from,
    engine: jsEngine,
  };
}

declare global {
  interface Window {
    _use_shiki?: Map<string, Root>;
  }
}

interface Task {
  key: string;
  aborted: boolean;
}

const cache = new Map<string, ReactNode>();

export function useShiki(
  code: string,
  {
    defaultValue,
    scriptKey,
    ...options
  }: HighlightOptions & {
    defaultValue?: ReactNode;
    scriptKey?: string;
  },
  deps?: DependencyList,
): ReactNode {
  const key = deps ? JSON.stringify(deps) : `${options.lang}:${code}`;
  const shikiOptions = getHighlightOptions(options);
  const currentTask = useRef<Task | undefined>({
    key,
    aborted: false,
  });

  const [rendered, setRendered] = useState<ReactNode>(() => {
    if (defaultValue) return defaultValue;
    const cached = cache.get(key);
    if (cached) return cached;

    // @ts-expect-error -- use shiki is typed
    const hast = globalThis._use_shiki?.get(scriptKey);

    if (hast) {
      const node = _renderHighlight(hast, shikiOptions);
      cache.set(key, node);
      return node;
    }

    currentTask.current = undefined;
    const Pre = (options.components?.pre ?? 'pre') as 'pre';
    const Code = (options.components?.code ?? 'code') as 'code';
    return (
      <Pre>
        <Code>{code}</Code>
      </Pre>
    );
  });

  if (typeof window === 'undefined') {
    return use(highlight(code, shikiOptions));
  }

  // on change
  if (!currentTask.current || currentTask.current.key !== key) {
    if (currentTask.current) {
      currentTask.current.aborted = true;
    }

    const task: Task = {
      key,
      aborted: false,
    };
    currentTask.current = task;

    highlight(code, shikiOptions).then((result) => {
      cache.set(key, result);
      if (!task.aborted) setRendered(result);
    });
  }

  return rendered;
}

export function PrerenderScript({
  scriptKey,
  code,
  options,
}: {
  scriptKey: string;
  code: string;
  options: HighlightOptions;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tree =
    typeof window === 'undefined'
      ? use(_highlight(code, getHighlightOptions(options)))
      : // @ts-expect-error -- typed
        globalThis._use_shiki?.get(scriptKey);

  if (mounted || !tree) return null;

  return (
    <script>{`if (typeof globalThis._use_shiki === "undefined") globalThis._use_shiki = new Map()
globalThis._use_shiki.set(${JSON.stringify(scriptKey)}, ${JSON.stringify(tree)})`}</script>
  );
}
