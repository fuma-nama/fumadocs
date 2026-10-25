'use client';
import { useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

const SAMPLES = 120;
/** size of a waveform pixel in CSS px */
const PIXEL = 2;

/** an oscilloscope of the scroll speed, like the audio wave in a status bar */
export function Waveform({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const ref = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const samples = new Float32Array(SAMPLES);
      let energy = 0;
      let amplitude = 0;
      let phase = 0;
      let raf = 0;
      let lastY = window.scrollY;
      let lastTime = performance.now();
      let color = '';

      /** the samples as steps of pixels in the current ink; returns the loudest */
      const paint = () => {
        const dpr = Math.min(window.devicePixelRatio, 2);
        const width = canvas.clientWidth * dpr;
        const height = canvas.clientHeight * dpr;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        const px = PIXEL * dpr;
        const rows = Math.floor(height / px);
        const step = width / SAMPLES;
        let peak = 0;
        let prev = -1;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = color;
        for (let i = 0; i < SAMPLES; i++) {
          peak = Math.max(peak, Math.abs(samples[i]));
          const y = Math.round(((1 - samples[i]) / 2) * (rows - 1)) * px;
          const top = prev === -1 ? y : Math.min(prev, y);
          const bottom = prev === -1 ? y : Math.max(prev, y);
          ctx.fillRect(Math.floor(i * step), top, Math.ceil(step), bottom - top + px);
          prev = y;
        }
        return peak;
      };

      const draw = () => {
        raf = 0;
        amplitude += (energy - amplitude) * 0.25;
        energy *= 0.88;
        phase += 0.3 + amplitude * 0.9;
        samples.copyWithin(0, 1);
        samples[SAMPLES - 1] = Math.sin(phase) * amplitude * (0.55 + 0.45 * Math.sin(phase * 0.29));
        if (paint() > 0.01 || energy > 0.01) raf = requestAnimationFrame(draw);
      };

      const onScroll = () => {
        const now = performance.now();
        const speed = Math.abs(window.scrollY - lastY) / Math.max(1, now - lastTime);
        lastY = window.scrollY;
        lastTime = now;
        energy = Math.min(1, energy + speed * 0.12);
        if (raf === 0) raf = requestAnimationFrame(draw);
      };
      // a new theme repaints the line in its ink at once
      const theme = new MutationObserver(() => {
        color = getComputedStyle(canvas).color;
        paint();
      });

      color = getComputedStyle(canvas).color;
      draw();
      theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      if (!reduced) window.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        theme.disconnect();
        window.removeEventListener('scroll', onScroll);
        cancelAnimationFrame(raf);
      };
    },
    [reduced],
  );

  return <canvas ref={ref} aria-hidden className={cn('h-3.5', className)} />;
}
