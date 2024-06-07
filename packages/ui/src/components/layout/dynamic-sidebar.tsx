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

  const onCollapse = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const onHover: PointerEventHandler = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    window.clearTimeout(timerRef.current);
    setHover(true);
  }, []);

  const onLeave: PointerEventHandler = useCallback((e) => {
    if (e.pointerType === 'touch') return;
    window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      setHover(false);
    }, 300);
  }, []);

  return (
    <>
      {collapsed ? (
        <div
          className="fixed inset-y-0 start-0 w-4 max-md:hidden xl:static xl:w-[260px]"
          onPointerEnter={onHover}
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
              className: 'fixed start-4 bottom-4 z-10 max-md:hidden',
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
          id: 'dynamic-sidebar',
          'data-collapse': collapsed,
          'data-hover': hover,
          onPointerEnter: onHover,
          onPointerLeave: onLeave,
          'aria-hidden': Boolean(collapsed && !hover),
          className: cn(
            'overflow-hidden md:transition-transform',
            collapsed &&
              'md:fixed md:inset-y-2 md:start-2 md:h-auto md:rounded-xl md:border md:shadow-md',
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
                  className: 'max-md:hidden ms-auto',
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
