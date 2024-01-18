/* eslint-disable import/no-relative-packages -- required */
import {
  LayoutIcon,
  LibraryIcon,
  PaperclipIcon,
  type LucideIcon,
} from 'lucide-react';
import mdx from '../../../packages/mdx/package.json';
import ui from '../../../packages/ui/package.json';
import zeta from '../../../packages/core/package.json';

export interface Mode {
  param: string;
  name: string;
  package: string;
  description: string;
  version: string;
  icon: LucideIcon;
}

export const modes: Mode[] = [
  {
    param: 'headless',
    name: 'Core',
    package: 'fuma-docs/core',
    description: 'The core library',
    version: zeta.version,
    icon: LibraryIcon,
  },
  {
    param: 'ui',
    name: 'UI',
    package: 'fuma-docs/ui',
    description: 'The user interface',
    version: ui.version,
    icon: LayoutIcon,
  },
  {
    param: 'mdx',
    name: 'MDX',
    package: 'fuma-docs/mdx',
    description: 'Built-in source provider',
    version: mdx.version,
    icon: PaperclipIcon,
  },
];
