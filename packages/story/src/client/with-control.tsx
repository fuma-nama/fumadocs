'use client';

import { cn } from '@/utils/cn';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './components/select';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { type FC, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { FieldSet } from './arg-form';
import { StoryProvider, useStory, useStoryArgs, type WithControlProps } from '@/provider';
import { useTranslations } from '@fuma-translate/react';

export type { VariantInfo, WithControlProps } from '@/provider';

export function WithControl(props: WithControlProps) {
  return (
    <StoryProvider {...props}>
      <Content />
    </StoryProvider>
  );
}

function Content() {
  const t = useTranslations({ note: 'story controls' });
  const { presets, displayName, Component, preset, variant, setVariant } = useStory();

  return (
    <div className="not-prose flex flex-col gap-1 p-1 border rounded-md shadow-sm bg-fd-card text-fd-card-foreground">
      <div className="flex flex-row items-center gap-2 empty:hidden">
        {displayName && <p className="text-sm font-medium px-1.5">{displayName}</p>}
        {presets.length > 1 && (
          <Select
            value={variant}
            onValueChange={(value) => {
              if (value === null) return;
              setVariant(value);
            }}
          >
            <SelectTrigger className="w-fit ms-auto border-none bg-transparent px-1.5 py-1 text-fd-muted-foreground text-xs font-medium">
              <SelectValue placeholder={t('No Variant')} />
            </SelectTrigger>
            <SelectContent>
              {presets.map((item) => (
                <SelectItem key={item.variant} value={item.variant} className="gap-2">
                  <p className="text-xs font-medium">{item.variant}</p>
                  <p className="text-xs text-fd-muted-foreground">{item.description}</p>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <StoryComponent Component={Component} />
      {preset && (
        <FieldSet
          field={preset.controls}
          fieldName={[]}
          name={t('Props')}
          className="max-h-[600px] overflow-auto"
        />
      )}
    </div>
  );
}

function StoryComponent({ Component }: { Component: FC }) {
  const t = useTranslations({ note: 'story error boundary' });
  const args = useStoryArgs();

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="p-3 border rounded-lg bg-fd-card text-fd-card-foreground text-sm">
          <p className="inline-flex items-center gap-2 font-medium mb-2">
            <AlertCircle className="text-fd-error size-4" />
            {t('Encountered error when rendering the component.')}
          </p>
          <p className="text-fd-muted-foreground mb-2">{String(error)}</p>
          <button
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
            onClick={() => resetErrorBoundary()}
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
  );
}
