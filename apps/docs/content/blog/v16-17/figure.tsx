'use client';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { cn } from '@/lib/cn';

export const ease = 'ease-[cubic-bezier(0.16,1,0.3,1)]';

export interface Steps {
  step: number;
  /** the caption of each step */
  captions: ReactNode[];
  go: (step: number) => void;
  /** go to the next step, or back to the first one */
  next: () => void;
}

export function useSteps(captions: ReactNode[]): Steps {
  const [step, setStep] = useState(0);

  return {
    step,
    captions,
    go: setStep,
    next: () => setStep((step + 1) % captions.length),
  };
}

/** items of a scene enter one by one */
export function enter(index: number): { className: string; style: CSSProperties } {
  return {
    className: cn(
      'transition-[opacity,translate,scale] duration-500 starting:opacity-0 motion-safe:starting:translate-y-2 motion-safe:starting:scale-95',
      ease,
    ),
    // after the previous scene fades out
    style: { transitionDelay: `${120 + index * 60}ms` },
  };
}

/**
 * One scene per step, sized to the largest scene so the figure keeps its height.
 */
export function Scenes({
  step,
  className,
  children,
}: {
  step: number;
  className?: string;
  children: ReactNode[];
}) {
  // a scene enters again with a new key when it becomes active, the previous one keeps its key to fade out
  const [visits, setVisits] = useState({ step, counts: [] as number[] });
  if (visits.step !== step) {
    const counts = [...visits.counts];
    counts[step] = (counts[step] ?? 0) + 1;
    setVisits({ step, counts });
  }

  return (
    <div className={cn('grid font-mono text-xs', className)}>
      {children.map((scene, i) => (
        <div
          key={`${i}-${visits.counts[i] ?? 0}`}
          aria-hidden={i !== step}
          className={cn(
            'col-start-1 row-start-1 flex min-w-0 items-center justify-center transition-[opacity,visibility] duration-200',
            i !== step && 'invisible opacity-0',
          )}
        >
          {scene}
        </div>
      ))}
    </div>
  );
}

export function Figure({
  steps,
  caption,
  children,
}: {
  steps?: Steps;
  caption?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="not-prose my-8 overflow-hidden rounded-xl border bg-fd-card">
      <div
        className={cn('p-3 sm:p-5', steps && 'cursor-pointer')}
        onClick={
          steps &&
          ((e) => {
            // clicks on controls and selecting text don't move on
            if ((e.target as Element).closest('button') || getSelection()?.toString()) return;
            steps.next();
          })
        }
      >
        {children}
      </div>
      <figcaption className="flex min-h-12 items-center gap-2 border-t px-3 py-2 text-sm">
        {steps ? <Controls steps={steps} /> : caption}
      </figcaption>
    </figure>
  );
}

function Controls({ steps: { step, captions, go } }: { steps: Steps }) {
  return (
    <>
      <p
        key={step}
        aria-live="polite"
        className={cn(
          'min-w-0 flex-1 text-pretty transition-[opacity,translate] duration-500 motion-safe:starting:translate-y-1 starting:opacity-0',
          ease,
        )}
      >
        <span className="me-2 font-mono text-xs tabular-nums text-fd-muted-foreground">
          {step + 1}/{captions.length}
        </span>
        {captions[step]}
      </p>
      <div className="flex shrink-0 items-center">
        {captions.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Step ${i + 1}`}
            aria-current={i === step}
            className="group p-1"
            onClick={() => go(i)}
          >
            <span
              className={cn(
                'block h-1.5 rounded-full bg-fd-muted-foreground transition-[width,background-color] duration-300 group-hover:bg-fd-foreground',
                i === step ? 'w-5 bg-fd-foreground' : 'w-1.5',
              )}
            />
          </button>
        ))}
      </div>
    </>
  );
}

export function Panel({
  label,
  aside,
  className,
  style,
  children,
}: {
  label: ReactNode;
  aside?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={cn('flex min-w-0 flex-col rounded-lg border bg-fd-background', className)}
      style={style}
    >
      <div className="flex items-center gap-2 border-b px-3 py-1.5 font-sans text-xs">
        <span className="font-medium">{label}</span>
        {aside && <span className="ms-auto truncate text-fd-muted-foreground">{aside}</span>}
      </div>
      <div className="flex-1 px-3 py-2 font-mono text-xs leading-5">{children}</div>
    </div>
  );
}

export type Line = string | { text: ReactNode; className?: string };

/** lines of code, blank lines take half the height */
export function Lines({ lines }: { lines: Line[] }) {
  return (
    <>
      {lines.map((line, i) => {
        const { text, className } = typeof line === 'string' ? { text: line } : line;
        if (text === '') return <div key={i} className={cn('h-2.5', className)} />;

        return (
          <p key={i} className={cn('whitespace-pre-wrap [overflow-wrap:anywhere]', className)}>
            {text}
          </p>
        );
      })}
    </>
  );
}
