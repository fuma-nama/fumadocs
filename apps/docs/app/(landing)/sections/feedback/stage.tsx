'use client';
import type { ReactNode } from 'react';
import { mount } from '../../lib/script';
import { createFeedback } from './engine';

const play = mount(createFeedback);

/** the quotes' desk under the title: two loose columns from 1024px, one column on phones */
export function Desk({ children }: { children: ReactNode }) {
  return (
    <div
      ref={play}
      className="relative z-10 mt-10 flex flex-col md:mt-12 lg:grid lg:grid-cols-[44%_40%] lg:items-start lg:gap-x-[14%]"
    >
      {children}
    </div>
  );
}
