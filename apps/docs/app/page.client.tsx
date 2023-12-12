'use client';

import Phenomenon from 'phenomenon';
import { useEffect, useRef, type CanvasHTMLAttributes } from 'react';
import {
  GLSLX_NAME_U_RESOLUTION,
  GLSLX_NAME_U_TIME,
  GLSLX_SOURCE_FRAGMENT_SHADER,
  GLSLX_SOURCE_VERTEX_SHADER,
} from '@/shaders/rain.min.js';

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
      <p className="text-xs text-muted-foreground">
        Moderator at Next.js Discord
      </p>
    </div>
  );
}
