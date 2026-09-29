'use client';

import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogListItem,
  SearchDialogOverlay,
  type SearchItemType,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { buttonVariants } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { meilisearchFilters } from 'fumadocs-core/search/client/meilisearch';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { cn } from '@/lib/cn';
import './meilisearch.css';

const FILTER_ATTRIBUTE = process.env.MEILISEARCH_FILTER_ATTRIBUTE || 'scope';

export default function MeilisearchSearchDialog(props: SharedProps) {
  const { locale } = useI18n();

  const defaultFilter = 'None';
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [filterOptions, setFilterOptions] = useState<string[]>([defaultFilter]);

  const clientOptions = useMemo(
    () => ({
      type: 'meilisearch' as const,
      filterAttributeValue: activeFilter,
      filterAttribute: FILTER_ATTRIBUTE,
      language: locale,
    }),
    [activeFilter, locale],
  );

  const { search, setSearch, query, loadMore, isLoadingMore, hasMore } = useDocsSearch(
    clientOptions,
    [activeFilter, locale],
  );

  useEffect(() => {
    if (!props.open) return;

    let finishRequest = true;

    (async () => {
      try {
        const availableFilters = [];
        availableFilters.push(defaultFilter);

        const fetchedFilters = await meilisearchFilters({
          filterAttribute: FILTER_ATTRIBUTE,
        });
        for (const filter of fetchedFilters ?? []) {
          availableFilters.push(filter);
        }

        if (finishRequest) {
          setFilterOptions(availableFilters);
        }
      } catch (error) {
        console.error(
          `Failed to load available filters from Meilisearch for '${FILTER_ATTRIBUTE}':`,
          error,
        );

        if (finishRequest) {
          setFilterOptions([defaultFilter]);
        }
      }
    })();

    return () => {
      finishRequest = false;
    };
  }, [props.open]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore) loadMore();
  }, [loadMore, isLoadingMore]);

  const items = useMemo<SearchItemType[] | null>(() => {
    if (query.data === 'empty' || !query.data) return null;
    if (!hasMore) return query.data;

    return [
      ...query.data,
      {
        id: '__load-more__',
        type: 'action',
        node: (
          <span className="text-fd-muted-foreground text-sm">
            {isLoadingMore ? 'Loading more results…' : 'Load more'}
          </span>
        ),
        onSelect: handleLoadMore,
      },
    ];
  }, [query.data, hasMore, isLoadingMore, handleLoadMore]);

  const renderItem = useCallback(
    ({ item, onClick }: { item: SearchItemType; onClick: () => void }) =>
      item.type === 'action' ? (
        <SearchDialogListItem item={item} onClick={item.onSelect} />
      ) : (
        <SearchDialogListItem item={item} onClick={onClick} />
      ),
    [],
  );

  return (
    <SearchDialog
      search={search}
      onSearchChange={handleSearchChange}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent className="meilisearch-dialog">
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>

        <SearchDialogList items={items} Item={renderItem} />

        <SearchDialogFooter className="flex flex-row items-center gap-2">
          <Popover open={openFilterDialog} onOpenChange={setOpenFilterDialog}>
            <PopoverTrigger
              className={buttonVariants({
                size: 'sm',
                variant: 'secondary',
              })}
            >
              <span className="text-fd-muted-foreground/80 me-2">Filter</span>
              {activeFilter === '' ? '' : filterOptions.find((item) => item === activeFilter)}
              <ChevronDown className="size-3.5 text-fd-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent className="flex flex-col p-1 gap-1" align="start">
              {filterOptions.map((item, i) => {
                const isSelected =
                  item === activeFilter || (item === defaultFilter && activeFilter === '');

                return (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveFilter(item === defaultFilter ? '' : item);
                      setOpenFilterDialog(false);
                    }}
                    className={cn(
                      'rounded-lg text-start px-2 py-1.5',
                      isSelected
                        ? 'text-fd-primary bg-fd-primary/10'
                        : 'hover:text-fd-accent-foreground hover:bg-fd-accent',
                    )}
                  >
                    <p className="font-medium mb-0.5">{item}</p>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
          <a
            href="https://meilisearch.com"
            rel="noreferrer noopener"
            className="ms-auto text-xs text-fd-muted-foreground"
          >
            Search powered by Meilisearch
          </a>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
