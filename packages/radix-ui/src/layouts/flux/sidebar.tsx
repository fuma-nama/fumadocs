'use client';
import * as Base from '@/components/sidebar/base';
import { cn } from '@fumadocs/ui/cn';
import { type ComponentProps, useEffect, useEffectEvent, useRef } from 'react';
import { cva } from 'class-variance-authority';
import { createPageTreeRenderer } from '@/components/sidebar/page-tree';
import { createLinkItemRenderer } from '@/components/sidebar/link-item';
import { mergeRefs } from '@fumadocs/ui/merge-refs';
import { motion } from 'motion/react';
import { RemoveScroll } from 'react-remove-scroll';

const MotionSidebarItem = motion.create(Base.SidebarItem);
const MotionSidebarFolderTrigger = motion.create(Base.SidebarFolderTrigger);
const MotionSidebarFolderLink = motion.create(Base.SidebarFolderLink);
const MotionSidebarFolderContent = motion.create(Base.SidebarFolderContent);

const itemVariants = cva(
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        link: 'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors',
        button:
          'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none',
      },
      highlight: {
        true: "data-[active=true]:before:content-[''] data-[active=true]:before:bg-fd-primary data-[active=true]:before:absolute data-[active=true]:before:w-px data-[active=true]:before:inset-y-2.5 data-[active=true]:before:start-2.5",
      },
    },
  },
);

function getItemOffset(depth: number) {
  return `calc(${2 + 3 * depth} * var(--spacing))`;
}

export function Sidebar(props: ComponentProps<typeof Base.SidebarProvider>) {
  return <Base.SidebarProvider {...props} />;
}

export function SidebarFolder(props: ComponentProps<typeof Base.SidebarFolder>) {
  return <Base.SidebarFolder {...props} />;
}

export function SidebarCollapseTrigger(props: ComponentProps<typeof Base.SidebarCollapseTrigger>) {
  return <Base.SidebarCollapseTrigger {...props} />;
}

export function SidebarViewport(props: ComponentProps<typeof Base.SidebarViewport>) {
  return <Base.SidebarViewport {...props} />;
}

export function SidebarTrigger(props: ComponentProps<typeof Base.SidebarTrigger>) {
  return <Base.SidebarTrigger {...props} />;
}

export function SidebarContent({
  ref: refProp,
  className,
  children,
  ...props
}: ComponentProps<'aside'>) {
  const ref = useRef<HTMLElement>(null);
  const { open, setOpen } = Base.useSidebar();

  const listener = useEffectEvent((e: KeyboardEvent) => {
    if (open && e.key === 'Escape') {
      setOpen(false);
      e.preventDefault();
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, []);

  return (
    <RemoveScroll enabled={open}>
      <motion.div
        className={cn(
          'fixed inset-0 py-10 z-30 backdrop-blur-md bg-fd-background/60',
          !open && 'pointer-events-none',
        )}
        initial="hide"
        variants={{
          show: {
            opacity: 1,
          },
          hide: {
            opacity: 0,
          },
        }}
        animate={open ? 'show' : 'hide'}
        exit="hide"
        onClick={() => {
          setOpen(false);
        }}
      >
        <motion.div
          className="absolute overflow-y-auto pr-(--removed-body-scroll-bar-size,0) [scrollbar-width:none] py-16 inset-0 bottom-26 overscroll-contain mask-[linear-gradient(to_bottom,transparent,white_calc(var(--spacing)*14),white_calc(100%-var(--spacing)*14),transparent)] lg:text-sm"
          variants={{
            show: {
              y: 0,
              opacity: 1,
            },
            hide: {
              y: '80%',
              opacity: 0,
            },
          }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
            opacity: {
              duration: 0.1,
            },
          }}
        >
          <motion.aside
            id="nd-sidebar"
            ref={mergeRefs(ref, refProp)}
            className={cn('mx-auto md:max-w-[400px]', className)}
            onClick={(e) => e.stopPropagation()}
            {...(props as ComponentProps<typeof motion.aside>)}
          >
            {children}
          </motion.aside>
        </motion.div>
      </motion.div>
    </RemoveScroll>
  );
}

export function SidebarSeparator({ className, style, children, ...props }: ComponentProps<'p'>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarSeparator
      className={cn('[&_svg]:size-4 [&_svg]:shrink-0', className)}
      style={{
        paddingInlineStart: getItemOffset(depth),
        ...style,
      }}
      {...props}
    >
      {children}
    </Base.SidebarSeparator>
  );
}

export function SidebarItem({
  className,
  style,
  children,
  ...props
}: ComponentProps<typeof Base.SidebarItem>) {
  const depth = Base.useFolderDepth();

  return (
    <MotionSidebarItem
      className={cn(itemVariants({ variant: 'link', highlight: depth >= 1 }), className)}
      style={{
        paddingInlineStart: getItemOffset(depth),
        ...style,
      }}
      {...(props as object)}
    >
      {children}
    </MotionSidebarItem>
  );
}

export function SidebarFolderTrigger({
  className,
  style,
  ...props
}: ComponentProps<typeof Base.SidebarFolderTrigger>) {
  const { depth, collapsible } = Base.useFolder()!;

  return (
    <MotionSidebarFolderTrigger
      className={cn(itemVariants({ variant: collapsible ? 'button' : null }), 'w-full', className)}
      style={{
        paddingInlineStart: getItemOffset(depth - 1),
        ...style,
      }}
      {...(props as ComponentProps<typeof MotionSidebarFolderTrigger>)}
    >
      {props.children}
    </MotionSidebarFolderTrigger>
  );
}

export function SidebarFolderLink({
  className,
  style,
  ...props
}: ComponentProps<typeof Base.SidebarFolderLink>) {
  const depth = Base.useFolderDepth();

  return (
    <MotionSidebarFolderLink
      className={cn(itemVariants({ variant: 'link', highlight: depth > 1 }), 'w-full', className)}
      style={{
        paddingInlineStart: getItemOffset(depth - 1),
        ...style,
      }}
      {...(props as ComponentProps<typeof MotionSidebarFolderLink>)}
    >
      {props.children}
    </MotionSidebarFolderLink>
  );
}

export function SidebarFolderContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Base.SidebarFolderContent>) {
  const depth = Base.useFolderDepth();
  const { open } = Base.useFolder()!;

  return (
    <MotionSidebarFolderContent
      className={cn(
        'relative',
        depth === 1 &&
          "before:content-[''] before:absolute before:w-px before:inset-y-1 before:bg-fd-border before:start-2.5",
        className,
      )}
      {...(props as ComponentProps<typeof MotionSidebarFolderContent>)}
    >
      <motion.div
        initial="hide"
        animate={open ? 'show' : 'hide'}
        exit="hide"
        variants={{
          show: {
            opacity: 1,
          },
          hide: {
            opacity: 0,
          },
        }}
      >
        {children}
      </motion.div>
    </MotionSidebarFolderContent>
  );
}

export const SidebarPageTree = createPageTreeRenderer({
  SidebarFolder,
  SidebarFolderContent,
  SidebarSeparator,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
});

export const SidebarLinkItem = createLinkItemRenderer({
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
});
