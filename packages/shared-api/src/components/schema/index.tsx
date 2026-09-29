'use client';
import { useMemo } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { SchemaUI, type SchemaUIProps } from './client';
import { type GenerateSchemaUIOptions, generateSchemaUI } from '@fumadocs/json-schema/react';

export {
  SchemaUI,
  SchemaUIProvider,
  InlineTag,
  BlockTag,
  useSchemaUI,
  useSchemaTabs,
  useSchemaPopover,
  useSchemaHighlight,
  useCopySchemaLink,
  type SchemaPathItem,
  type SchemaUIProps,
  type SchemaUIContextType,
} from './client';

export interface SchemaUIOptions extends Omit<GenerateSchemaUIOptions, 'translations'> {
  client: Omit<SchemaUIProps, 'generated'>;
}

export function Schema({ client, ...options }: SchemaUIOptions) {
  const translations = useTranslations().translations;
  const generated = useMemo(
    () => generateSchemaUI({ ...options, translations }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the options
    [
      options.root,
      options.readOnly,
      options.writeOnly,
      options.showExample,
      options.renderMarkdown,
      options.renderCodeblock,
      translations,
    ],
  );

  return <SchemaUI {...client} generated={generated} />;
}
