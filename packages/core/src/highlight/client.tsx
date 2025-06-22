'use client';
import {
  type DependencyList,
  type ReactNode,
  use,
  useEffect,
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
import type { Root } from 'hast';

interface Task {
  key: string;
  aborted: boolean;
}

export function useShiki(
  code: string,
  {
    withPrerenderScript = false,
    loading,
    ...options
  }: HighlightOptions & {
    withPrerenderScript?: boolean;

    /**
     * Displayed before highlighter is loaded.
     */
    loading?: ReactNode;
  },
  deps?: DependencyList,
): ReactNode {
  const markupId = useId();
  const key = useMemo(
    () => (deps ? JSON.stringify(deps) : `${options.lang}:${code}`),
    [code, deps, options.lang],
  );
  const shikiOptions: HighlightOptions = {
    ...options,
    engine: options.engine ?? 'js',
  };

  const currentTask = useRef<Task | undefined>({
    key,
    aborted: false,
  });

  const [rendered, setRendered] = useState<ReactNode>(() => {
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
    return loading;
  });

  useEffect(() => {
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
