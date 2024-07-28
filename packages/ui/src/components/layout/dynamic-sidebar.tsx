'use client';
import { type PointerEventHandler, useCallback, useRef, useState } from 'react';
import { SidebarIcon } from 'lucide-react';
import { Sidebar, type SidebarProps } from '@/components/layout/sidebar';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';
import { useSidebar } from '@/contexts/sidebar';

export function DynamicSidebar(props: SidebarProps): React.ReactElement {
  const { collapsed, setCollapsed } = useSidebar();
  const [hover, setHover] = useState(false);
  const timerRef = useRef(0);
  const closeTimeRef = useRef(0);

  const onCollapse = useCallback(() => {
    setCollapsed((v) => !v);
    setHover(false);
    closeTimeRef.current = Date.now() + 150;
  }, [setCollapsed]);

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
          className: cn(
            'md:transition-[transform,margin]',
            collapsed && [
              'md:top-1 md:mr-[-240px] md:h-[calc(100dvh-4px)] md:animate-fd-sidebar-collapse md:rounded-xl md:border md:shadow-md xl:mr-[-260px]',
              hover
                ? 'md:translate-x-1 rtl:md:-translate-x-1'
                : 'md:-translate-x-full rtl:md:translate-x-full',
            ],
          ),
        }}
        footer={
          <>
            {props.footer}
            <button
              type="button"
              aria-label="Collapse Sidebar"
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  size: 'icon',
                  className: 'max-md:hidden',
                }),
              )}
              onClick={onCollapse}
            >
              <SidebarIcon />
            </button>
          </>
        }
      />
    </>
  );
}
