'use client';
import {
  DocsLayout,
  DocsLayoutProps,
  NavigationPanel,
  NavigationPanelOverlay,
  NavigationPanelProps,
} from 'fumadocs-ui/layouts/flux';
import {
  AISearch,
  AISearchInput,
  AISearchInputActions,
  AISearchPanelHeader,
  AISearchPanelList,
  useAISearchContext,
  useHotKey,
} from '@/components/ai/search';
import { MessageCircleIcon } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/lib/cn';
import { AnimatePresence, motion } from 'motion/react';
import { useSidebar } from 'fumadocs-ui/components/sidebar/base';
import { useEffect, useState } from 'react';

export function LayoutClient(props: DocsLayoutProps) {
  return (
    <AISearch>
      <DocsLayout
        {...props}
        renderNavigationPanel={(panel) => <CustomNavigationPanel {...panel} />}
      >
        {props.children}
      </DocsLayout>
    </AISearch>
  );
}

function CustomNavigationPanel({ tool, ...props }: NavigationPanelProps) {
  const [mounted, setMounted] = useState(false);
  const ai = useAISearchContext();
  const sidebar = useSidebar();
  useHotKey();

  const variants = {
    show: {
      opacity: 1,
      y: 0,
    },
    hide: {
      opacity: 0,
      y: '100%',
    },
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <NavigationPanelOverlay
        enabled={ai.open}
        onClick={() => ai.setOpen(false)}
        className="pt-6 pb-34"
      >
        <AnimatePresence>
          {ai.open && (
            <motion.div
              className="flex flex-col size-full px-3 mx-auto sm:max-w-[380px]"
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
              initial="hide"
              animate="show"
              exit="hide"
              transition={{
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1],
                opacity: {
                  duration: 0.2,
                },
              }}
            >
              <AISearchPanelHeader onClick={(e) => e.stopPropagation()} />
              <AISearchPanelList className="flex-1" />
            </motion.div>
          )}
        </AnimatePresence>
      </NavigationPanelOverlay>
      <NavigationPanel
        layout="size"
        tool={
          <>
            <button
              aria-label="Ask AI"
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  size: 'icon-sm',
                }),
              )}
              onClick={() => {
                ai.setOpen(!ai.open);
                sidebar.setOpen(false);
              }}
            >
              <MessageCircleIcon />
            </button>
            {tool}
          </>
        }
        {...props}
      >
        {(node) => (
          <AnimatePresence mode="popLayout">
            {ai.open ? (
              <motion.div
                key="ai"
                variants={variants}
                initial="hide"
                animate="show"
                exit="hide"
                transition={{ duration: 0.2 }}
              >
                <AISearchInput />
                <div className="flex items-center gap-1.5 p-1 empty:hidden">
                  <AISearchInputActions />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                variants={variants}
                initial={mounted && 'hide'}
                animate="show"
                exit="hide"
                transition={{ duration: 0.2 }}
              >
                {node}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </NavigationPanel>
    </>
  );
}
