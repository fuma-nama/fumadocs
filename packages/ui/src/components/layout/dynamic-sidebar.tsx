'use client';
import {
  type PointerEventHandler,
  type ReactElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SidebarIcon } from 'lucide-react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { Sidebar, type SidebarProps } from '@/components/layout/sidebar';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar';

export default function DynamicSidebar(props: SidebarProps): ReactElement {
  const { collapsed, setCollapsed } = useSidebar();
  const [hover, setHover] = useState(false);
  const timerRef = useRef(0);
  const closeTimeRef = useRef(0);

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
        <>
          <div
            className="fixed inset-y-0 start-0 w-6 max-md:hidden"
            onPointerEnter={onEnter}
            onPointerLeave={onLeave}
          />
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
            onClick={() => {
              setCollapsed((v) => !v);
            }}
          >
            <SidebarIcon />
          </button>
          <style>{`#nd-page { --fd-sidebar-width: 0px; }`}</style>
        </>
      ) : null}
      <Sidebar
        {...props}
        aside={useMemo(
          () => ({
            'data-collapse': collapsed,
            'data-hover': hover,
            onPointerEnter: collapsed ? onEnter : undefined,
            onPointerLeave: collapsed ? onLeave : undefined,
            'aria-hidden': Boolean(collapsed && !hover),
            style: {
              // the offset given to docs content when the sidebar is collapsed
              '--fd-content-offset': 'calc(var(--fd-sidebar-width) * -1)',
            } as object,
            className: cn(
              'md:transition-[transform,margin,flex]',
              collapsed && [
                'md:me-[var(--fd-content-offset)] md:grow-0 md:shadow-md',
                hover
                  ? 'md:translate-x-0'
                  : 'md:translate-x-[calc(var(--fd-sidebar-width)*-1)] rtl:md:translate-x-[var(--fd-sidebar-width)]',
              ],
              ``,
            ),
          }),
          [collapsed, hover, onEnter, onLeave],
        )}
      />
      <div
        role="none"
        className={cn('transition-all max-md:hidden', collapsed && 'flex-1')}
      />
    </>
  );
}
