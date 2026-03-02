import { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

type Awaitable<T> = T | Promise<T>;

export interface LayoutConfig {
  base?: () => Awaitable<BaseLayoutProps>;
}
