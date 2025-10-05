import type { MetaData, PageData } from '@/source';
import type { FC } from 'react';

export interface VirtualPage {
  path: string;
  data: PageData & Record<string, unknown>;
  body: FC<unknown>;
}

export interface VirtualMeta {
  path: string;
  data: MetaData;
}
