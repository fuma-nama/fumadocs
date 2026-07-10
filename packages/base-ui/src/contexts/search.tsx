'use client';
import type { DefaultSearchDialogProps } from '@/components/dialog/search-default';
import { Dialog } from '@base-ui/react/dialog';
import {
  type ComponentType,
  createContext,
  lazy,
  type ReactNode,
  Suspense,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';

interface HotKey {
  display: ReactNode;

  /**
   * Key code or a function determining whether the key is pressed.
   */
  key: string | ((e: KeyboardEvent) => boolean);
}

/** built-in Base UI Dialog handle */
const dialogHandle = Dialog.createHandle();

export interface SharedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogHandle: Dialog.Handle<unknown>;
}

export type SearchLink = [name: string, href: string];

export interface TagItem {
  name: string;
  value: string;
}

export interface SearchProviderProps<DialogProps extends SharedProps = DefaultSearchDialogProps> {
  /**
   * Preload search dialog before opening it
   *
   * @defaultValue `true`
   * @deprecated Ignored, it must be preloaded for Base UI dialog to work
   */
  preload?: boolean;

  /**
   * Custom links to be displayed if search is empty
   */
  links?: SearchLink[];

  /**
   * Hotkeys for triggering search dialog
   *
   * @defaultValue Meta/Ctrl + K
   */
  hotKey?: HotKey[];

  /**
   * Replace default search dialog, allowing you to use other solutions such as Algolia Search
   *
   * It receives the `open` and `onOpenChange` prop, can be lazy loaded with `React.lazy()`
   */
  SearchDialog?: ComponentType<DialogProps>;

  /**
   * Additional props to the dialog
   */
  options?: Partial<DialogProps>;

  children?: ReactNode;
}

interface SearchContextType {
  enabled: boolean;
  open: boolean;
  hotKey: HotKey[];
  setOpenSearch: (value: boolean) => void;
  dialogHandle: Dialog.Handle<unknown>;
}

const SearchContext = createContext<SearchContextType>({
  enabled: false,
  open: false,
  hotKey: [],
  setOpenSearch: () => undefined,
  dialogHandle,
});

export function useSearchContext(): SearchContextType {
  return use(SearchContext);
}

function MetaOrControl() {
  const [key, setKey] = useState('⌘');

  useEffect(() => {
    if (/Windows|Linux/i.test(window.navigator.userAgent)) setKey('Ctrl');
  }, []);

  return key;
}

const DEFAULT_HOT_KEYS: HotKey[] = [
  {
    key: (e) => e.metaKey || e.ctrlKey,
    display: <MetaOrControl />,
  },
  {
    key: 'k',
    display: 'K',
  },
];

const DefaultSearchDialog = lazy(() => import('@/components/dialog/search-default'));

export function SearchProvider<DialogProps extends SharedProps = DefaultSearchDialogProps>({
  SearchDialog = DefaultSearchDialog,
  children,
  options,
  hotKey = DEFAULT_HOT_KEYS,
  links,
}: SearchProviderProps<DialogProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (hotKey.every((v) => (typeof v.key === 'string' ? e.key === v.key : v.key(e)))) {
      setIsOpen((open) => !open);
      e.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <SearchContext
      value={useMemo(
        () => ({
          enabled: true,
          open: isOpen,
          hotKey,
          dialogHandle,
          setOpenSearch: setIsOpen,
        }),
        [isOpen, hotKey],
      )}
    >
      <Suspense fallback={null}>
        {/* @ts-expect-error -- assume all required props are filled */}
        <SearchDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          links={links}
          dialogHandle={dialogHandle}
          {...options}
        />
      </Suspense>

      {children}
    </SearchContext>
  );
}

/**
 * Show children only when search is enabled via React Context
 */
export function SearchOnly({ children }: { children: ReactNode }) {
  const search = useSearchContext();

  if (search.enabled) return children;
}
