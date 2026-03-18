import type { BaseLayoutProps, NavOptions } from '@/layouts/shared';
import type { HomeSlots } from './client';
import type { ComponentProps } from 'react';

export interface HomeLayoutProps extends BaseLayoutProps, ComponentProps<'main'> {
  nav?: Nav;
  slots?: HomeSlots;
}

interface Nav extends NavOptions {
  /**
   * Open mobile menu when hovering the trigger
   */
  enableHoverToOpen?: boolean;
}

export { HomeLayout, useHomeLayout } from './client';
