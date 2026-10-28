'use client';

import { cn } from '@/utils/cn';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './components/select';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { CircleAlert, Maximize } from 'lucide-react';
import {
  type RefObject,
  Suspense,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Controls } from './controls';
import {
  type StoryFrameOptions,
  StoryProvider,
  useStory,
  useStoryArgs,
  useStoryFrame,
  type WithControlProps,
} from '@/provider';
import type { TypeNode } from '@/type-tree/types';
import { useTranslations } from '@fuma-translate/react';

export type { VariantInfo, WithControlProps } from '@/provider';

export function WithControl(props: WithControlProps) {
  return (
    <StoryProvider {...props}>
      <Content />
    </StoryProvider>
  );
}

// fullscreen support never changes, it is read once hydrated
const subscribeNever = () => () => {};

function Content() {
  const t = useTranslations({ note: 'story controls' });
  const { presets, displayName, frame, preset, variant, setVariant } = useStory();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const fullscreenEnabled = useSyncExternalStore(
    subscribeNever,
    () => document.fullscreenEnabled,
    () => false,
  );
  const canFullscreen = frame !== undefined && fullscreenEnabled;
  const reset = () => setVariant(variant);

  return (
    <div className="not-prose overflow-hidden rounded-xl border bg-fd-card text-fd-card-foreground">
      {(displayName || presets.length > 1 || canFullscreen) && (
        <div className="flex h-10 items-center justify-end gap-1 ps-4 pe-1.5">
          {displayName && (
            <p className="me-auto truncate text-[0.8125rem] font-medium">{displayName}</p>
          )}
          {presets.length > 1 && <VariantSelect />}
          {canFullscreen && (
            <button
              type="button"
              aria-label={t('Fullscreen')}
              title={t('Fullscreen')}
              onClick={() => frameRef.current?.requestFullscreen()}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                'text-fd-muted-foreground [&_svg]:size-3.5',
              )}
            >
              <Maximize />
            </button>
          )}
        </div>
      )}
      <div className="p-1.5 not-first:pt-0">
        {frame ? <FramePreview {...frame} ref={frameRef} /> : <Preview onReset={reset} />}
      </div>
      {preset && hasControls(preset.controls) && (
        <Controls key={variant} node={preset.controls} onReset={reset} />
      )}
    </div>
  );
}

function hasControls(node: TypeNode): boolean {
  const root = node.type === 'intersection' ? node.intersection : node;
  return root.type !== 'never' && (root.type !== 'object' || root.properties.length > 0);
}

function VariantSelect() {
  const t = useTranslations({ note: 'story controls' });
  const { presets, variant, setVariant } = useStory();

  return (
    <Select value={variant} onValueChange={(value) => value !== null && setVariant(value)}>
      <SelectTrigger className="h-7 w-auto max-w-64 gap-1.5 border-0 bg-transparent px-2 text-xs hover:bg-fd-accent focus:ring-0 focus-visible:ring-2">
        <span className="text-fd-muted-foreground">{t('Variant')}</span>
        <SelectValue className="truncate font-medium" />
      </SelectTrigger>
      <SelectContent align="end">
        {presets.map((item) => (
          <SelectItem key={item.variant} value={item.variant} className="text-xs">
            <span className="flex flex-col">
              {item.variant}
              {item.description && (
                <span className="text-fd-muted-foreground">{item.description}</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Preview({ onReset }: { onReset: () => void }) {
  const t = useTranslations({ note: 'story error boundary' });
  const { Component } = useStory();
  const args = useStoryArgs();

  return (
    <div className="rounded-md border bg-fd-background px-2.25 py-4">
      <ErrorBoundary
        // recover once the arguments change
        resetKeys={[args]}
        fallbackRender={({ error }) => (
          <div role="alert" className="flex flex-col items-start gap-2 text-sm">
            <p className="inline-flex items-center gap-2 font-medium">
              <CircleAlert className="size-3.5 shrink-0 text-fd-error" />
              {t('Encountered error when rendering the component.')}
            </p>
            <p className="font-mono text-xs break-all text-fd-muted-foreground">
              {error instanceof Error ? error.message : String(error)}
            </p>
            <button
              type="button"
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
              onClick={onReset}
            >
              {t('Reset')}
            </button>
          </div>
        )}
      >
        <Suspense>
          <Component {...args} key={undefined} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function FramePreview({
  src,
  width = 1280,
  height = 800,
  Container,
  ref,
}: StoryFrameOptions & { ref: RefObject<HTMLIFrameElement | null> }) {
  const { displayName } = useStory();
  const connect = useStoryFrame();
  const [scale, setScale] = useState<number>();
  const observe = useCallback(
    (element: HTMLDivElement) => {
      const observer = new ResizeObserver(() => setScale(element.clientWidth / width));
      // the frame shares the main thread with the page, load it when the page is idle
      const idle = window.requestIdleCallback ?? setTimeout;
      const handle = idle(() => observer.observe(element));
      return () => {
        (window.cancelIdleCallback ?? clearTimeout)(handle);
        observer.disconnect();
      };
    },
    [width],
  );
  const frameRef = useCallback(
    (iframe: HTMLIFrameElement) => {
      ref.current = iframe;
      return connect(iframe);
    },
    [ref, connect],
  );

  const viewport = (
    <div
      ref={observe}
      className="relative overflow-hidden bg-fd-background"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {scale !== undefined && (
        <iframe
          ref={frameRef}
          src={src}
          title={displayName}
          loading="lazy"
          width={width}
          height={height}
          // `transform` is reset in fullscreen, unlike `scale`
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `scale(${scale})` }}
        />
      )}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-md border">
      {Container ? <Container>{viewport}</Container> : viewport}
    </div>
  );
}
