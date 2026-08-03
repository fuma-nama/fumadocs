import Slugger from 'github-slugger';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import {
  type GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
} from 'graphql';
import type { GeneratedPageProps } from '@/utils/pages';
import { getOperationField, getOperationTitle } from '@/utils/schema';

export function toStaticData(
  page: GeneratedPageProps,
  schema: GraphQLSchema,
): {
  toc: TOCItemType[];
  structuredData: StructuredData;
} {
  const slugger = new Slugger();
  const toc: TOCItemType[] = [];
  const structuredData: StructuredData = { headings: [], contents: [] };

  function onHeading(title: string) {
    const id = slugger.slug(title);

    toc.push({
      depth: 2,
      title,
      url: `#${id}`,
    });
    structuredData.headings.push({
      content: title,
      id,
    });
  }

  function onContent(content: string | null | undefined | false) {
    if (!content) return;

    structuredData.contents.push({
      content,
      heading: structuredData.headings.at(-1)?.id,
    });
  }

  for (const item of page.items ?? []) {
    if (item.type === 'operation') {
      const field = getOperationField(schema, item.kind, item.name);
      if (!field) continue;

      if (page.showTitle) onHeading(getOperationTitle(field.name));
      onContent(field.description);
      for (const arg of field.args) {
        onContent(arg.description && `${arg.name}: ${arg.description}`);
      }
      continue;
    }

    const type = schema.getType(item.name);
    if (!type) continue;

    if (page.showTitle) onHeading(type.name);
    onContent(type.description);

    if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        onContent(field.description && `${field.name}: ${field.description}`);
      }
    } else if (isEnumType(type)) {
      for (const value of type.getValues()) {
        onContent(value.description && `${value.name}: ${value.description}`);
      }
    }
  }

  return { toc, structuredData };
}
