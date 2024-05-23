import { type PointerEventHandler, useCallback, useRef, useState } from 'react';
import { SidebarIcon } from 'lucide-react';
import { Sidebar, SidebarProps } from '@/components/sidebar';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';
import { useSidebarCollapse } from '@/contexts/sidebar';

export function DynamicSidebar(props: SidebarProps): React.ReactElement {
  const [open, setOpen] = useSidebarCollapse();
  const [hover, setHover] = useState(false);
  const timerRef = useRef(0);

  const onCollapse = (): void => {
    setOpen(!open);
  };

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
      {!open ? (
        <div
          className="fixed bottom-0 start-0 top-16 max-md:hidden"
          onPointerEnter={onHover}
          onPointerLeave={onLeave}
          style={{
            maxWidth: '240px',
            width: 'calc(max(0px, 100vw - 1400px)/2)',
            minWidth: '1rem',
          }}
        />
      ) : null}
      {!open ? (
        <button
          type="button"
          aria-label="Trigger Sidebar"
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
      <div
        id="dynamic-sidebar"
        data-open={open}
        data-hover={hover}
        onPointerEnter={onHover}
        onPointerLeave={onLeave}
        aria-hidden={!open && !hover}
        className={cn(
          'z-40 transition-transform max-md:absolute',
          !open &&
            'md:fixed md:bottom-2 md:start-2 md:top-16 md:overflow-hidden md:rounded-xl md:border md:bg-background md:shadow-md',
        )}
      >
        <Sidebar
          {...props}
          className={cn(!open && 'md:h-full')}
          footer={
            <>
              {props.footer}
              <button
                type="button"
                aria-label="Trigger Sidebar"
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
      </div>
    </>
  );
}
