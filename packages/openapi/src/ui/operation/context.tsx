'use client';
import { useMemo, useRef } from 'react';
import type { RawRequestData, RequestData } from '@/requests/types';
import type { ExampleRequestItem } from '@/utils/get-example-requests';
import { useOperationState } from '@/headless/operation';

type ExampleUpdateListener = (data: RawRequestData, encoded: RequestData) => void;

/** @deprecated use `useOperation()`, `useExampleRequests()` and `useExampleRequest()` from `fumadocs-openapi/headless` */
export function useOperationContext() {
  const state = useOperationState();
  const legacyListeners = useRef(new WeakMap<ExampleUpdateListener, () => void>());

  return useMemo(() => {
    const { path, security, ...info } = state.info;
    const active = () => state.examples.find((item) => item.id === state.example)!;

    return {
      ...info,
      route: path,
      securities: security,
      codeUsages: state.codeUsages,
      examples: state.examples as ExampleRequestItem[],
      example: state.example,
      setExample: state.setExample,
      setExampleData: state.update,
      addListener(listener: ExampleUpdateListener) {
        const notify = () => {
          const item = active();
          listener(item.data, item.encoded);
        };
        notify();
        legacyListeners.current.set(listener, notify);
        state.subscribe(notify);
      },
      removeListener(listener: ExampleUpdateListener) {
        const notify = legacyListeners.current.get(listener);
        // the set-based store makes re-subscribing the same function a no-op
        if (notify) state.subscribe(notify)();
      },
    };
  }, [state]);
}
