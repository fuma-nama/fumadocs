'use client';
import {
  type DependencyList,
  lazy,
  type ReactNode,
  Suspense,
  useRef,
  useState,
} from 'react';
import { highlight, type HighlightOptions } from '@/utils/shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import type { RegexEngine } from 'shiki';

let jsEngine: RegexEngine | undefined;

/**
 * Create `lazy` component that pre-renders codeblock on server
 */
function createPreRenderer(code: string, options: HighlightOptions) {
  return lazy(async () => {
    const result = await highlight(code, getHighlightOptions(options));

    return {
      default() {
        return result;
      },
    };
  });
}

function getHighlightOptions(from: HighlightOptions): HighlightOptions {
  if (from.engine) return from;

  if (!jsEngine) {
    jsEngine = createJavaScriptRegexEngine();
  }

  return {
    ...from,
    engine: jsEngine,
  };
}

const map = new Map<string, ReturnType<typeof createPreRenderer>>();
const cache = new Map<string, ReactNode>();

interface Task {
  key: string;
  aborted: boolean;
}

export function useShiki(
  code: string,
  options: HighlightOptions & {
    defaultValue?: ReactNode;
  },
  deps?: DependencyList,
): ReactNode {
  const key = deps ? JSON.stringify(deps) : `${options.lang}:${code}`;
  const currentTask = useRef<Task>(undefined);
  const [rendered, setRendered] = useState<ReactNode>(() => {
    if (options.defaultValue) return options.defaultValue;
    const cached = cache.get(key);
    if (cached) return cached;

    let Prerender = map.get(key);

    if (!Prerender) {
      Prerender = createPreRenderer(code, options);
      map.set(key, Prerender);
    }

    currentTask.current = {
      key,
      aborted: false,
    };

    const Pre = (options.components?.pre ?? 'pre') as 'pre';
    const Code = (options.components?.code ?? 'code') as 'code';
    return (
      <Suspense
        fallback={
          <Pre>
            <Code>{code}</Code>
          </Pre>
        }
      >
        <Prerender />
      </Suspense>
    );
  });

  // on change
  if (
    typeof window !== 'undefined' &&
    (!currentTask.current || currentTask.current.key !== key)
  ) {
    if (currentTask.current) {
      currentTask.current.aborted = true;
    }

    const task: Task = {
      key,
      aborted: false,
    };
    currentTask.current = task;

    highlight(code, getHighlightOptions(options)).then((result) => {
      cache.set(key, result);
      if (!task.aborted) setRendered(result);
    });
  }

  return rendered;
}
