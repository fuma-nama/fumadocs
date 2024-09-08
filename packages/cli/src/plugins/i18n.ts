import { type Plugin } from '@/commands/add';
import { generated } from '@/generated';

export const i18nPlugin: Plugin = {
  files: {
    'lib/i18n.ts': generated['lib/i18n'],
    'middleware.ts': generated.middleware,
  },
  dependencies: [],
  instructions: [],
};
