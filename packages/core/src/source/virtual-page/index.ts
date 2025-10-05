import type { MetaData, PageData } from '@/source';
import type { FC } from 'react';

export interface VirtualPage {
  data: PageData & Record<string, unknown>;
  body: FC<unknown>;
}

export interface VirtualMeta {
  data: MetaData;
}
