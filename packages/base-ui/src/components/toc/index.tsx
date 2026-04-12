'use client';
import * as Primitive from 'fumadocs-core/toc';
import { type ComponentProps, createContext, use, useRef } from 'react';
import { cn } from '@/utils/cn';
import { mergeRefs } from '@/utils/merge-refs';

const TOCContext = createContext<Primitive.TOCItemType[]>([]);

export function useTOCItems(): Primitive.TOCItemType[] {
  return use(TOCContext);
}

export type TOCProviderProps = Primitive.AnchorProviderProps;

export const { useActiveAnchor, useActiveAnchors, useItems } = Primitive;

export function TOCProvider({ toc, children, ...props }: TOCProviderProps) {
  return (
    <TOCContext value={toc}>
      <Primitive.AnchorProvider toc={toc} {...props}>
        {children}
      </Primitive.AnchorProvider>
    </TOCContext>
  );
}

export function TOCScrollArea({ ref, className, ...props }: ComponentProps<'div'>) {
  const viewRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={mergeRefs(viewRef, ref)}
      className={cn(
        'relative min-h-0 text-sm ms-px overflow-auto [scrollbar-width:none] mask-[linear-gradient(to_bottom,transparent,white_16px,white_calc(100%-16px),transparent)] py-3',
        className,
      )}
      {...props}
    >
      <Primitive.ScrollProvider containerRef={viewRef}>{props.children}</Primitive.ScrollProvider>
    </div>
  );
}
