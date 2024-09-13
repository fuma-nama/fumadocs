/* eslint-disable import/no-relative-packages -- required */
import {
  LibraryIcon,
  Building2,
  PaperclipIcon,
  type LucideIcon,
} from 'lucide-react';
import mdx from '../../../packages/mdx/package.json';
import ui from '../../../packages/ui/package.json';
import zeta from '../../../packages/core/package.json';

export interface Mode {
  param: string;
  name: string;
  description: string;
  version: string;
  icon: LucideIcon;
}

export const modes: Mode[] = [
  {
    param: 'ui',
    name: 'Framework',
    description: 'The docs framework',
    version: ui.version,
    icon: Building2,
  },
  {
    param: 'headless',
    name: 'Core',
    description: 'The core library',
    version: zeta.version,
    icon: LibraryIcon,
  },
  {
    param: 'mdx',
    name: 'MDX',
    description: 'Built-in source provider',
    version: mdx.version,
    icon: PaperclipIcon,
  },
];
