'use client';
import { type PointerEventHandler, useCallback, useRef, useState } from 'react';
import { SidebarIcon } from 'lucide-react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { Sidebar, type SidebarProps } from '@/components/layout/sidebar';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar';

export function DynamicSidebar(props: SidebarProps): React.ReactElement {
  const { collapsed, setCollapsed } = useSidebar();
  const [hover, setHover] = useState(false);
  const timerRef = useRef(0);
  const closeTimeRef = useRef(0);

  const onCollapse = useCallback(() => {
    setCollapsed((v) => !v);
  }, [setCollapsed]);

  useOnChange(collapsed, () => {
    setHover(false);
    closeTimeRef.current = Date.now() + 150;
  });

  const onEnter: PointerEventHandler = useCallback((e) => {
    if (e.pointerType === 'touch' || closeTimeRef.current > Date.now()) return;
    window.clearTimeout(timerRef.current);
    setHover(true);
  }, []);

  const onLeave: PointerEventHandler = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(
      () => {
        setHover(false);
        closeTimeRef.current = Date.now() + 150;
      },
      Math.min(e.clientX, document.body.clientWidth - e.clientX) > 100
        ? 0
        : 500,
    );
  }, []);

  return (
    <>
      {collapsed ? (
        <div
          className="fixed inset-y-0 start-0 w-6 max-md:hidden xl:w-[50px]"
          onPointerEnter={onEnter}
          onPointerLeave={onLeave}
        />
      ) : null}
      {collapsed ? (
        <button
          type="button"
          aria-label="Collapse Sidebar"
          className={cn(
            buttonVariants({
              color: 'secondary',
              size: 'icon',
              className: 'fixed start-4 bottom-2 z-10 max-md:hidden',
            }),
          )}
          onClick={onCollapse}
        >
          <SidebarIcon />
        </button>
      ) : null}
      <Sidebar
        {...props}
        aside={{
          'data-collapse': collapsed,
          'data-hover': hover,
          onPointerEnter: onEnter,
          onPointerLeave: onLeave,
          'aria-hidden': Boolean(collapsed && !hover),
          style: {
            // the offset given to docs content when the sidebar is collapsed
            '--fd-content-offset':
              'max(calc(var(--fd-c-sidebar) - 2 * var(--fd-sidebar-width)), var(--fd-sidebar-width) * -1)',
          } as object,
          className: cn(
            'md:transition-[transform,padding,width,margin]',
            collapsed && [
              'md:me-[var(--fd-content-offset)] md:w-[var(--fd-sidebar-width)] md:rounded-xl md:border md:ps-0 md:shadow-md',
              hover
                ? 'md:translate-x-1 rtl:md:-translate-x-1'
                : 'md:translate-x-[calc(var(--fd-sidebar-width)*-1)] rtl:md:translate-x-[var(--fd-sidebar-width)]',
            ],
          ),
        }}
      />
    </>
  );
}
