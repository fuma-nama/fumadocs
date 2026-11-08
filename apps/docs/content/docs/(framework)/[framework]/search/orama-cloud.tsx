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
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useOramaCloudSearch } from 'fumadocs-core/search/client';
import { OramaCloud } from '@orama/core';
import { useI18n } from 'fumadocs-ui/contexts/i18n';

const orama = new OramaCloud({
  projectId: '',
  apiKey: '',
});

export default function CustomSearchDialog(props: SharedProps) {
  const { locale } = useI18n(); // (optional) for i18n
  const search = useOramaCloudSearch({
    client: orama,
    locale,
  });

  return (
    <SearchDialog {...search} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList />
        <SearchDialogFooter>
          <a
            href="https://orama.com"
            rel="noreferrer noopener"
            className="ms-auto text-xs text-fd-muted-foreground"
          >
            Search powered by Orama
          </a>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
