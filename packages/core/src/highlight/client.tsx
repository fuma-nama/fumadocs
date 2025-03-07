'use client';
import {
  type DependencyList,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  use,
  useState,
  useLayoutEffect,
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
  const markupId = useId();
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
    const element =
      withPrerenderScript && typeof document !== 'undefined'
        ? document.querySelector(`[data-markup-id="${markupId}"]`)
        : null;
    const attr = element?.getAttribute('data-markup');

    if (attr) {
      const hast = JSON.parse(attr);
      return renderHighlightWithMarkup(markupId, hast, shikiOptions, attr);
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

  useLayoutEffect(() => {
    if (currentTask.current?.key === key) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listen for defined deps only
  }, [key]);

  if (typeof window === 'undefined') {
    // return promise on server
    return use(
      _highlight(code, shikiOptions).then((tree) =>
        renderHighlightWithMarkup(markupId, tree, shikiOptions),
      ),
    );
  }

  return rendered;
}

function renderHighlightWithMarkup(
  id: string,
  tree: Root,
  shikiOptions: HighlightOptions,
  rawAttr?: string,
) {
  const Pre = (shikiOptions.components?.pre ?? 'pre') as 'pre';

  return _renderHighlight(tree, {
    ...shikiOptions,
    components: {
      ...shikiOptions.components,
      pre: (props) => (
        <Pre
          {...props}
          data-markup-id={id}
          data-markup={rawAttr ?? JSON.stringify(tree)}
        />
      ),
    },
  });
}
