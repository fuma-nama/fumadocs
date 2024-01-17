'use client';

import { ExternalLinkIcon } from 'lucide-react';
import { useDocsSearch } from 'next-docs-zeta/search/client';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { useI18n } from '@/contexts/i18n';
import { CommandGroup, CommandItem } from '@/components/ui/command';
import { SearchDialog, type SharedProps } from './search';

export type DefaultSearchDialogProps = SharedProps & {
  /**
   * Custom links to be displayed if search is empty
   */
  links?: [name: string, link: string][];

  /**
   * Search tag
   */
  tag?: string;
  footer?: ReactNode;
};

export default function DefaultSearchDialog({
  tag,
  links = [],
  ...props
}: DefaultSearchDialogProps): JSX.Element {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch(locale, tag);
  const router = useRouter();

  const onSelect = (v: string): void => {
    router.push(v);
    props.onOpenChange(false);
  };

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      data={query.data}
      {...props}
    >
      <CommandGroup value="items">
        {links.map(([name, link]) => (
          <CommandItem
            key={link}
            value={link}
            onSelect={onSelect}
            icon={<ExternalLinkIcon />}
          >
            {name}
          </CommandItem>
        ))}
      </CommandGroup>
    </SearchDialog>
  );
}
