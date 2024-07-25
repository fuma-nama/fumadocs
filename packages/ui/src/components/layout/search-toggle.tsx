import { type ButtonHTMLAttributes, useCallback } from 'react';
import { SearchIcon } from 'lucide-react';
import { useSearchContext } from '@/contexts/search';
import { useI18n } from '@/contexts/i18n';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';

export function SearchToggle(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
): React.ReactElement {
  const { setOpenSearch } = useSearchContext();

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({
          size: 'icon',
          color: 'ghost',
          className: props.className,
        }),
      )}
      data-search=""
      aria-label="Open Search"
      onClick={useCallback(() => {
        setOpenSearch(true);
      }, [setOpenSearch])}
    >
      <SearchIcon />
    </button>
  );
}

export function LargeSearchToggle(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
): React.ReactElement {
  const { hotKey, setOpenSearch } = useSearchContext();
  const { text } = useI18n();

  return (
    <button
      type="button"
      data-search-full=""
      {...props}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border bg-fd-secondary/50 p-1.5 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground',
        props.className,
      )}
      onClick={useCallback(() => {
        setOpenSearch(true);
      }, [setOpenSearch])}
    >
      <SearchIcon className="ms-1 size-4" />
      {text.search}
      <div className="ms-auto inline-flex gap-0.5">
        {hotKey.map((k, i) => (
          <kbd key={i} className="rounded-md border bg-fd-background px-1.5">
            {k.display}
          </kbd>
        ))}
      </div>
    </button>
  );
}
