'use client';

import Phenomenon from 'phenomenon';
import {
  useEffect,
  useRef,
  type CanvasHTMLAttributes,
  useState,
  Fragment,
  type ReactElement,
  type HTMLAttributes,
} from 'react';
import { TerminalIcon } from 'lucide-react';
import {
  GLSLX_NAME_U_RESOLUTION,
  GLSLX_NAME_U_TIME,
  GLSLX_SOURCE_FRAGMENT_SHADER,
  GLSLX_SOURCE_VERTEX_SHADER,
} from '@/shaders/rain.min.js';
import { cn } from '@/utils/cn';

export function Rain(
  props: CanvasHTMLAttributes<HTMLCanvasElement>,
): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let contextType = 'experimental-webgl';
    if (canvas.getContext('webgl2')) contextType = 'webgl2';
    if (canvas.getContext('webgl')) contextType = 'webgl';

    // Create a renderer
    const phenomenon = new Phenomenon({
      canvas,
      contextType,
      settings: {
        alpha: true,
        position: { x: 0, y: 0, z: 1 },
        shouldRender: true,
      },
    });

    phenomenon.add('', {
      mode: 4,
      vertex: GLSLX_SOURCE_VERTEX_SHADER,
      geometry: {
        vertices: [
          { x: -100, y: 100, z: 0 },
          { x: -100, y: -100, z: 0 },
          { x: 100, y: 100, z: 0 },
          { x: 100, y: -100, z: 0 },
          { x: -100, y: -100, z: 0 },
          { x: 100, y: 100, z: 0 },
        ] as unknown as object[][],
      },
      fragment: GLSLX_SOURCE_FRAGMENT_SHADER,
      uniforms: {
        [GLSLX_NAME_U_RESOLUTION]: {
          type: 'vec2',
          value: [
            canvas.width * window.devicePixelRatio,
            canvas.height * window.devicePixelRatio,
          ],
        },
        [GLSLX_NAME_U_TIME]: {
          type: 'float',
          // @ts-expect-error -- Wrong type definitions
          value: 0.0,
        },
      },
      onRender: ({ uniforms }: { uniforms: Record<string, unknown> }) => {
        const time = uniforms[GLSLX_NAME_U_TIME] as { value: number };
        time.value += 0.01;
      },
    });

    return () => {
      phenomenon.destroy();
    };
  }, []);

  return <canvas width={1000} height={1000} ref={ref} {...props} />;
}

export function Previews(): JSX.Element {
  return (
    <div className="rounded-xl border bg-gradient-to-b from-secondary to-muted p-6 text-sm">
      <p className="text-base">I&apos;m satisfied with it</p>

      <a
        href="https://joulev.dev"
        rel="noreferrer noopener"
        className="mt-4 inline-flex items-center font-medium"
      >
        @joulev
      </a>
      <p className="text-xs text-muted-foreground">Next.js Expert</p>
    </div>
  );
}

export function CreateAppAnimation(): JSX.Element {
  const installCmd = 'npm create next-docs-app';
  const tickTime = 100;
  const timeCommandEnter = installCmd.length;
  const timeCommandRun = timeCommandEnter + 3;
  const timeCommandEnd = timeCommandRun + 3;
  const timeWindowOpen = timeCommandEnd + 1;
  const timeEnd = timeWindowOpen + 1;

  const [tick, setTick] = useState(timeEnd);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => (prev >= timeEnd ? prev : prev + 1));
    }, tickTime);

    return () => {
      clearInterval(timer);
    };
  }, [timeEnd]);

  const lines: ReactElement[] = [];

  lines.push(
    <span key="command_type">
      {installCmd.substring(0, tick)}
      {tick < timeCommandEnter && (
        <div className="inline-block h-3 w-1 animate-pulse bg-white" />
      )}
    </span>,
  );

  if (tick >= timeCommandEnter) {
    lines.push(<span key="space"> </span>);
  }

  if (tick > timeCommandRun)
    lines.push(
      <Fragment key="command_response">
        <span className="font-bold">┌ Create Next Docs</span>
        <span>│</span>
        {tick > timeCommandRun + 1 && (
          <>
            <span className="font-bold">◇ Project name</span>
            <span>│ my-app</span>
          </>
        )}
        {tick > timeCommandRun + 2 && (
          <>
            <span>│</span>
            <span className="font-bold">
              ◆ Which example you want to install?
            </span>
          </>
        )}
        {tick > timeCommandRun + 3 && (
          <>
            <span>│ ● Default (Contentlayer)</span>
            <span>│ ○ Advanced (Contentlayer)</span>
            <span>│ ○ Default (Next Docs MDX)</span>
          </>
        )}
      </Fragment>,
    );

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (tick >= timeEnd) {
          setTick(0);
        }
      }}
    >
      {tick > timeWindowOpen && (
        <LaunchAppWindow className="absolute bottom-5 right-4 z-10 animate-in fade-in slide-in-from-top-10" />
      )}
      <pre className="overflow-hidden rounded-xl border text-xs">
        <div className="flex flex-row items-center gap-2 border-b px-4 py-2">
          <TerminalIcon className="h-4 w-4" />{' '}
          <span className="font-bold">Terminal</span>
          <div className="grow" />
          <div className="h-2 w-2 rounded-full bg-red-400" />
        </div>
        <div className="min-h-[200px] bg-gradient-to-b from-secondary [mask-image:linear-gradient(to_bottom,white,transparent)]">
          <code className="grid p-4">{lines}</code>
        </div>
      </pre>
    </div>
  );
}

function LaunchAppWindow(props: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      {...props}
      className={cn(
        'overflow-hidden rounded-md border bg-background shadow-xl',
        props.className,
      )}
    >
      <div className="relative flex h-6 flex-row items-center border-b bg-muted px-4 text-xs text-muted-foreground">
        <p className="absolute inset-x-0 text-center">localhost:3000</p>
      </div>
      <div className="p-4 text-sm">New App launched!</div>
    </div>
  );
}
