'use client';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/cn';
import { Figure, ease } from './figure';

const sizes = ['0.5 MB', '2 MB', '5 MB'];

/** median time in ms of 16.16 and 16.17, for each size */
const metrics: Record<string, [number, number][]> = {
  'Default plugins': [
    [119, 9.4],
    [482, 34.1],
    [1496, 87.5],
  ],
  'Remark LLMs': [
    [49, 1.1],
    [184, 4.1],
    [498, 14.1],
  ],
  'Remark Structure': [
    [49, 2.4],
    [196, 11.1],
    [594, 30.3],
  ],
};

const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export function PerfChart() {
  const [metric, setMetric] = useState('Default plugins');
  const [shown, setShown] = useState(false);
  const [hovered, setHovered] = useState<number>();
  const values = metrics[metric];
  const max = values[values.length - 1][0];
  const ref = useCallback((element: HTMLDivElement) => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setShown(true);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Figure
      caption={
        <p className="text-pretty text-fd-muted-foreground">
          Median time of the remark plugins (parsing excluded) on the Fumadocs docs, concatenated
          into one document. Apple M5 Max, Node.js 22.
        </p>
      }
    >
      <div ref={ref}>
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="inline-flex rounded-lg bg-fd-secondary p-0.5 text-xs">
            {Object.keys(metrics).map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={name === metric}
                className={cn(
                  'rounded-md px-2.5 py-1 transition-colors',
                  name === metric
                    ? 'bg-fd-background shadow-sm ring-1 ring-fd-border dark:bg-fd-accent'
                    : 'text-fd-muted-foreground hover:text-fd-foreground',
                )}
                onClick={() => setMetric(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="ms-auto flex gap-3 text-xs text-fd-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-fd-muted-foreground" />
              16.16
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-fd-foreground" />
              16.17
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4" onPointerLeave={() => setHovered(undefined)}>
          {values.map((pair, i) => (
            <div
              key={sizes[i]}
              className={cn(
                'grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-3 transition-opacity duration-300',
                hovered !== undefined && hovered !== i && 'opacity-40',
              )}
              onPointerEnter={() => setHovered(i)}
            >
              <span className="text-sm">{sizes[i]}</span>
              <div className="flex flex-col gap-1">
                {pair.map((value, version) => (
                  <div key={version} className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-3.5 min-w-0.5 rounded-e-sm transition-[width] duration-700 motion-reduce:transition-none',
                        ease,
                        version === 0 ? 'bg-fd-muted-foreground' : 'bg-fd-foreground',
                      )}
                      style={{
                        width: shown ? `calc((100% - 4.5rem) * ${value / max})` : 0,
                        transitionDelay: `${i * 120 + version * 300}ms`,
                      }}
                    />
                    <span
                      className={cn(
                        'shrink-0 font-mono text-xs tabular-nums text-fd-muted-foreground transition-opacity duration-500',
                        !shown && 'opacity-0',
                      )}
                      style={{ transitionDelay: `${i * 120 + version * 300 + 400}ms` }}
                    >
                      {format.format(value)} ms
                    </span>
                  </div>
                ))}
              </div>
              <span className="text-end font-mono text-sm tabular-nums">
                {Math.round(pair[0] / pair[1])}×
              </span>
            </div>
          ))}
        </div>
      </div>
    </Figure>
  );
}
