'use client';
import {
  createContext,
  type FC,
  type ReactNode,
  type RefCallback,
  use,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StfProvider, useDataEngine, useListener, useStf } from '@fumari/stf';
import type { TypeNode } from '@/type-tree/types';
import { cloneArgs } from '@/utils/args';

export interface VariantInfo {
  variant: string;
  description?: string;
}

export interface StoryPreset extends VariantInfo {
  controls: TypeNode;
  defaultValues?: Record<string, unknown>;
}

export interface StoryFrameOptions {
  /** same-origin URL of a page rendering `<story.Frame />` */
  src: string;
  /**
   * viewport width of the frame, scaled down to fit the panel.
   *
   * @defaultValue 1280
   */
  width?: number;
  /**
   * viewport height of the frame.
   *
   * @defaultValue 800
   */
  height?: number;
}

export interface WithControlProps {
  displayName?: string;
  Component: FC;
  presets: StoryPreset[];
  /** render the component in an iframe */
  frame?: StoryFrameOptions;
}

export interface StoryProviderProps extends WithControlProps {
  children: ReactNode;
}

export interface StoryState extends WithControlProps {
  /** the selected preset, `undefined` when the variant doesn't exist */
  preset?: StoryPreset;
  variant: string;
  /** select a variant, resetting the arguments to its default values */
  setVariant: (variant: string) => void;
}

const StoryContext = createContext<StoryState | null>(null);

/**
 * The state of a story: its selected variant and the arguments of the rendered component.
 */
export function StoryProvider({
  presets,
  displayName,
  Component,
  frame,
  children,
}: StoryProviderProps) {
  const [variant, setVariant] = useState(presets[0].variant);
  const preset = presets.find((preset) => preset.variant === variant);
  const stf = useStf({
    defaultValues: () => cloneArgs(preset?.defaultValues ?? {}),
  });

  return (
    <StfProvider value={stf}>
      <StoryContext
        value={useMemo(
          () => ({
            presets,
            displayName,
            Component,
            frame,
            preset,
            variant,
            setVariant(value) {
              const preset = presets.find((preset) => preset.variant === value);
              if (!preset) return;

              setVariant(value);
              stf.dataEngine.reset(cloneArgs(preset.defaultValues ?? {}));
            },
          }),
          [presets, displayName, Component, frame, preset, variant, stf],
        )}
      >
        {children}
      </StoryContext>
    </StfProvider>
  );
}

export function useStory(): StoryState {
  const ctx = use(StoryContext);
  if (!ctx) throw new Error('Component must be used under <StoryProvider />');

  return ctx;
}

/**
 * Arguments of the rendered component, debounced so typing doesn't re-render it on every keystroke.
 */
export function useStoryArgs(): Record<string, unknown> {
  const engine = useDataEngine();
  const timerRef = useRef(0);
  const [args, setArgs] = useState(() => cloneArgs(engine.getData()));
  useListener({
    onUpdate() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setArgs(cloneArgs(engine.getData())), 100);
    },
  });

  return useDeferredValue(args) as Record<string, unknown>;
}

/**
 * Ref of the iframe for `frame`, it sends the story arguments to `<story.Frame />`.
 */
export function useStoryFrame(): RefCallback<HTMLIFrameElement> {
  const args = useStoryArgs();

  return useCallback(
    (iframe: HTMLIFrameElement) => {
      const send = () =>
        iframe.contentWindow?.postMessage({ type: 'fumadocs-story:args', args }, location.origin);
      const onMessage = (e: MessageEvent) => {
        if (e.source === iframe.contentWindow && e.data?.type === 'fumadocs-story:ready') send();
      };

      window.addEventListener('message', onMessage);
      send();
      return () => window.removeEventListener('message', onMessage);
    },
    [args],
  );
}
