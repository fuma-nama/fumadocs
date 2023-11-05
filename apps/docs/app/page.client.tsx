// @ts-nocheck
'use client'

import {
  GLSLX_NAME_U_RESOLUTION,
  GLSLX_NAME_U_TIME,
  GLSLX_SOURCE_FRAGMENT_SHADER,
  GLSLX_SOURCE_VERTEX_SHADER
} from '@/shaders/rain.min.js'
import Phenomenon from 'phenomenon'
import { useEffect, useRef, type CanvasHTMLAttributes } from 'react'

export function Rain(props: CanvasHTMLAttributes<HTMLCanvasElement>) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const contextType = canvas.getContext('webgl2')
      ? 'webgl2'
      : canvas.getContext('webgl')
      ? 'webgl'
      : 'experimental-webgl'

    // Create a renderer
    const phenomenon = new Phenomenon({
      canvas,
      contextType,
      settings: {
        alpha: true,
        position: { x: 0, y: 0, z: 1 },
        shouldRender: true
      }
    })

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
          { x: 100, y: 100, z: 0 }
        ]
      },
      fragment: GLSLX_SOURCE_FRAGMENT_SHADER,
      uniforms: {
        [GLSLX_NAME_U_RESOLUTION]: {
          type: 'vec2',
          value: [
            canvas.width * window.devicePixelRatio,
            canvas.height * window.devicePixelRatio
          ]
        },
        [GLSLX_NAME_U_TIME]: {
          type: 'float',
          value: 0.0
        }
      },
      onRender: ({ uniforms }) => {
        uniforms[GLSLX_NAME_U_TIME].value += 0.01
      }
    })

    return () => {
      phenomenon.destroy()
    }
  }, [])

  return <canvas width={1000} height={1000} ref={ref} {...props} />
}

export function Previews() {
  return (
    <div className="p-6 rounded-xl border bg-gradient-to-b from-secondary to-muted text-sm">
      <p className="text-base">I&apos;m satisfied with it</p>

      <a
        href="https://joulev.dev"
        rel="noreferrer noopener"
        className="inline-flex items-center font-medium mt-4"
      >
        @joulev
      </a>
      <p className="text-muted-foreground text-xs">
        Moderator at Next.js Discord
      </p>
    </div>
  )
}
