'use client';

import * as Base from '@/components/sidebar/base';
import { cn } from '@/utils/cn';
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { cva } from 'class-variance-authority';
import {
  createPageTreeRenderer,
  type SidebarPageTreeComponents,
} from '@/components/sidebar/page-tree';
import { createLinkItemRenderer } from '@/components/sidebar/link-item';
import { mergeRefs } from '@/utils/merge-refs';
import { AnimatePresence, motion } from 'motion/react';
import { RemoveScroll } from 'react-remove-scroll';
import { useFluxLayout } from '..';
import { XIcon, SidebarIcon } from 'lucide-react';

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

export interface SidebarProps extends ComponentProps<'aside'> {
  components?: Partial<SidebarPageTreeComponents>;
  banner?: ReactNode;
  footer?: ReactNode;
}

export type SidebarProviderProps = Base.SidebarProviderProps;

export const { useSidebar } = Base;

export function SidebarProvider(props: SidebarProviderProps) {
  return <Base.SidebarProvider {...props} />;
}

export function Sidebar({ footer, banner, components, ...rest }: SidebarProps) {
  const { menuItems } = useFluxLayout();

  return (
    <SidebarContent {...rest}>
      <div className="flex flex-col gap-3 p-4 pb-2 empty:hidden">{banner}</div>
      <Base.SidebarViewport>
        <div className="flex flex-col">
          {menuItems
            .filter((v) => v.type !== 'icon')
            .map((item, i, list) => (
              <SidebarLinkItem
                key={i}
                item={item}
                className={cn(i === list.length - 1 && 'mb-4')}
              />
            ))}
          <SidebarPageTree {...components} />
        </div>
      </Base.SidebarViewport>
      {footer}
    </SidebarContent>
  );
}

export function SidebarTrigger(props: ComponentProps<'button'>) {
  const { open, setOpen } = useSidebar();
  return (
    <button onClick={() => setOpen((prev) => !prev)} {...props}>
      <AnimatePresence mode="wait">
        <motion.span
          key={open ? 'open' : 'closed'}
          transition={{ duration: 0.2 }}
          initial={{
            y: '100%',
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          exit={{
            y: '100%',
            opacity: 0,
          }}
        >
          {open ? <XIcon /> : <SidebarIcon />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function SidebarContent({ ref: refProp, className, children, ...props }: ComponentProps<'aside'>) {
  const ref = useRef<HTMLElement>(null);
  const [blockScroll, setBlockScroll] = useState(false);
  const { open, setOpen } = useSidebar();

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

  if (open && !blockScroll) setBlockScroll(true);

  return (
    <RemoveScroll enabled={blockScroll}>
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
        onAnimationComplete={(definition) => {
          if (definition === 'hide') setBlockScroll(false);
        }}
      >
        <motion.div
          className="absolute top-0 min-h-0 inset-x-0 bottom-26 overflow-y-auto fd-scroll-container pr-(--removed-body-scroll-bar-size,0) py-16 mask-[linear-gradient(to_bottom,transparent,white_--spacing(14),white_calc(100%---spacing(14)),transparent)] lg:text-sm"
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
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <motion.aside
            id="nd-sidebar"
            ref={mergeRefs(ref, refProp)}
            className={cn('mx-auto sm:max-w-[400px]', className)}
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

function SidebarFolder(props: ComponentProps<typeof Base.SidebarFolder>) {
  return <Base.SidebarFolder {...props} />;
}

function SidebarSeparator({ className, style, children, ...props }: ComponentProps<'p'>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarSeparator
      className={cn(
        'inline-flex items-center gap-2 mb-1.5 px-2 mt-6 empty:mb-0 [&_svg]:size-4 [&_svg]:shrink-0',
        depth === 0 && 'first:mt-0',
        className,
      )}
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

function SidebarItem({
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

function SidebarFolderTrigger({
  className,
  style,
  ...props
}: ComponentProps<typeof Base.SidebarFolderTrigger>) {
  const { depth, collapsible } = Base.useFolder()!;

  return (
    <MotionSidebarFolderTrigger
      className={(state) =>
        cn(
          itemVariants({ variant: collapsible ? 'button' : null }),
          'w-full',
          typeof className === 'function' ? className(state) : className,
        )
      }
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

function SidebarFolderLink({
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

function SidebarFolderContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Base.SidebarFolderContent>) {
  const depth = Base.useFolderDepth();
  const { open } = Base.useFolder()!;

  return (
    <MotionSidebarFolderContent
      className={(state) =>
        cn(
          'relative',
          depth === 1 &&
            "before:content-[''] before:absolute before:w-px before:inset-y-1 before:bg-fd-border before:start-2.5",
          typeof className === 'function' ? className(state) : className,
        )
      }
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

const SidebarPageTree = createPageTreeRenderer({
  SidebarFolder,
  SidebarFolderContent,
  SidebarSeparator,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
});

const SidebarLinkItem = createLinkItemRenderer({
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
});
