import { Sidebar, SidebarProps } from '@/components/sidebar';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';
import { SidebarIcon } from 'lucide-react';
import { useSidebarCollapse } from '@/contexts/sidebar';
import { type PointerEventHandler, useCallback, useRef, useState } from 'react';

export function DynamicSidebar(props: SidebarProps) {
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
          className="fixed top-16 left-0 bottom-0 max-md:hidden"
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
              className: 'fixed left-4 bottom-4 z-10 max-md:hidden',
            }),
          )}
          onClick={onCollapse}
        >
          <SidebarIcon />
        </button>
      ) : null}
      <div
        data-slide={true}
        onPointerEnter={onHover}
        onPointerLeave={onLeave}
        aria-hidden={!open && !hover}
        className={cn(
          'z-40 transition-transform',
          !open && [
            'md:fixed md:left-2 md:top-16 md:bottom-2 md:border md:overflow-hidden md:shadow-md md:bg-background md:rounded-xl md:[&_#sidebar-background]:w-full md:[&_#sidebar-background]:left-0',
            hover && 'md:translate-x-0',
            !hover && 'md:translate-x-[calc(-100%-1rem)]',
          ],
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
