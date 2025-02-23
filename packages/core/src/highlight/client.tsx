'use client';
import {
  type DependencyList,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  _highlight,
  _renderHighlight,
  highlight,
  type HighlightOptions,
} from './shiki';
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

export function useShiki(
  code: string,
  {
    defaultValue,
    withPrerenderScript = false,
    ...options
  }: HighlightOptions & {
    withPrerenderScript?: boolean;
    defaultValue?: ReactNode;
  },
  deps?: DependencyList,
): ReactNode {
  const scriptKey = useId();
  const key = useMemo(
    () => (deps ? JSON.stringify(deps) : `${options.lang}:${code}`),
    [code, deps, options.lang],
  );
  const shikiOptions = getHighlightOptions(options);
  const currentTask = useRef<Task | undefined>({
    key,
    aborted: false,
  });

  const [rendered, setRendered] = useState<ReactNode>(() => {
    if (defaultValue) return defaultValue;
    // @ts-expect-error -- use shiki is typed
    const hast = globalThis._use_shiki?.get(scriptKey);

    if (hast && withPrerenderScript) {
      return (
        <>
          <PrerenderScript scriptKey={scriptKey} tree={hast} />
          {_renderHighlight(hast, shikiOptions)}
        </>
      );
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
    // return promise on server
    return _highlight(code, shikiOptions).then((tree) => {
      return (
        <>
          {withPrerenderScript && (
            <PrerenderScript scriptKey={scriptKey} tree={tree} />
          )}
          {_renderHighlight(tree, shikiOptions)}
        </>
      );
    }) as ReactNode;
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

    void highlight(code, shikiOptions).then((result) => {
      if (!task.aborted) setRendered(result);
    });
  }

  return rendered;
}

function PrerenderScript({
  scriptKey,
  tree,
}: {
  tree: Root;
  scriptKey: string;
}) {
  return (
    <script>{`if (typeof globalThis._use_shiki === "undefined") globalThis._use_shiki = new Map()
globalThis._use_shiki.set(${JSON.stringify(scriptKey)}, ${JSON.stringify(tree)})`}</script>
  );
}
