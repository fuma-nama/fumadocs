'use client';
import { useMemo, type ReactNode } from 'react';
import {
  type DirectiveNode,
  type FieldDefinitionNode,
  getNamedType,
  type GraphQLArgument,
  type GraphQLDefaultInput,
  type GraphQLInputType,
  type InputValueDefinitionNode,
  type GraphQLNamedType,
  type GraphQLSchema,
  type GraphQLType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isRequiredArgument,
  isRequiredInputField,
  isScalarType,
  isUnionType,
  print,
  valueToLiteral,
} from 'graphql';
import { fromTranslations, useTranslations } from '@fuma-translate/react';
import {
  SchemaUI,
  InlineTag,
  type SchemaUIProps,
} from '@fumadocs/api-docs/components/schema/client';
import type { SchemaData, SchemaUIGeneratedData } from '@fumadocs/api-docs/components/schema';
import { getCustomDirectives } from '@/utils/schema';
import { useRenderContext } from './contexts/api';
import { Markdown } from './components/markdown';
import { EnumValueList } from './components/enum-values';
import { DirectiveList } from './components/type-annotation';

/**
 * a field-like root to render: a plain type, an argument, or a field.
 */
export interface SchemaViewRoot {
  type: GraphQLType;
  description?: string | null;
  deprecationReason?: string | null;
  args?: readonly GraphQLArgument[];
  default?: GraphQLDefaultInput;
  astNode?: { readonly directives?: readonly DirectiveNode[] } | null;
}

export interface SchemaViewProps {
  client: Omit<SchemaUIProps, 'generated'>;
  root: SchemaViewRoot;
}

const TagCardClass = 'flex flex-col w-full bg-fd-secondary border rounded-lg shadow-md';
const TagCardTitleClass =
  'font-medium text-xs text-fd-muted-foreground rounded-t-[inherit] bg-fd-muted not-prose border-b';

export function GraphQLSchemaView({ client, root }: SchemaViewProps) {
  const { schema } = useRenderContext().schema;
  const translations = useTranslations().translations;
  const generated = useMemo(
    () => generateGraphQLSchemaUI(schema, root, translations),
    [schema, root, translations],
  );

  return <SchemaUI {...client} generated={generated} />;
}

export function generateGraphQLSchemaUI(
  schema: GraphQLSchema,
  root: SchemaViewRoot,
  translations: Partial<Record<string, string>> = {},
): SchemaUIGeneratedData {
  const t = fromTranslations(translations, { note: 'graphql schema ui' });
  const refs: Record<string, SchemaData> = {};

  interface DocInfo {
    description?: string | null;
    deprecationReason?: string | null;
    args?: readonly GraphQLArgument[];
    defaultText?: string;
    directives?: readonly DirectiveNode[];
  }

  function ensureType(type: GraphQLType): string {
    const key = String(type);
    if (key in refs) return key;

    const data = {} as SchemaData;
    // register before recursion to guard against cyclic references
    refs[key] = data;
    Object.assign(data, buildData(type, {}));
    return key;
  }

  interface FieldLike {
    name: string;
    description?: string | null;
    deprecationReason?: string | null;
    type: GraphQLType;
    args?: readonly GraphQLArgument[];
    default?: GraphQLDefaultInput;
    astNode?: (FieldDefinitionNode | InputValueDefinitionNode) | null;
  }

  function ensureField(parent: GraphQLNamedType, field: FieldLike): string {
    const key = `${parent.name}.${field.name}`;
    if (key in refs) return key;

    const data = {} as SchemaData;
    refs[key] = data;
    Object.assign(
      data,
      buildData(field.type, {
        description: field.description,
        deprecationReason: field.deprecationReason,
        args: field.args,
        defaultText: printDefaultValue(field.default, field.type as GraphQLInputType),
        directives: getCustomDirectives(field.astNode),
      }),
    );
    return key;
  }

  function buildData(type: GraphQLType, doc: DocInfo): SchemaData {
    if (isNonNullType(type) || isListType(type)) {
      // collapse wrappers into the named type, GraphQL-style annotations (e.g. `[User!]!`) are
      // kept in `aliasName` to communicate list/non-null.
      return {
        ...buildData(type.ofType, doc),
        aliasName: String(type),
      };
    }

    const named = getNamedType(type);
    const base = {
      typeName: named.name,
      aliasName: String(type),
      deprecated: doc.deprecationReason != null,
      description: buildDescription(named, doc),
      infoTags: [...buildDocTags(doc), ...buildNamedTags(named)],
    };

    if (isScalarType(named) || isEnumType(named)) {
      return { ...base, type: 'primitive' };
    }

    if (isUnionType(named)) {
      return {
        ...base,
        type: 'or',
        items: named.getTypes().map((item) => ({
          name: item.name,
          $type: ensureType(item),
        })),
      };
    }

    if (isInputObjectType(named)) {
      return {
        ...base,
        type: 'object',
        props: Object.values(named.getFields()).map((field) => ({
          name: field.name,
          $type: ensureField(named, field),
          required: isRequiredInputField(field),
        })),
      };
    }

    if (isObjectType(named) || isInterfaceType(named)) {
      return {
        ...base,
        type: 'object',
        props: Object.values(named.getFields()).map((field) => ({
          name: field.name,
          $type: ensureField(named, field),
          required: isNonNullType(field.type),
        })),
      };
    }

    return { ...base, type: 'primitive' };
  }

  function buildDescription(named: GraphQLNamedType, doc: DocInfo): ReactNode {
    const description = doc.description ?? named.description;
    if (!description) return;

    return <Markdown md={description} />;
  }

  function buildDocTags(doc: DocInfo) {
    const tags: { node: ReactNode }[] = [];

    if (doc.deprecationReason) {
      tags.push({
        node: (
          <InlineTag label={t('Deprecated')} prose>
            <Markdown md={doc.deprecationReason} />
          </InlineTag>
        ),
      });
    }

    if (doc.defaultText !== undefined) {
      tags.push({
        node: <InlineTag label={t('Default')}>{doc.defaultText}</InlineTag>,
      });
    }

    if (doc.directives && doc.directives.length > 0) {
      tags.push({
        node: <DirectiveList directives={doc.directives} />,
      });
    }

    if (doc.args && doc.args.length > 0) {
      tags.push({
        node: (
          <div className={TagCardClass}>
            <p className={`${TagCardTitleClass} p-2`}>{t('Arguments')}</p>
            {doc.args.map((arg) => (
              <div key={arg.name} className="text-xs px-2 py-1.5">
                <div className="flex items-center not-prose gap-2">
                  <code className="font-medium text-fd-primary">{arg.name}</code>
                  <code className="text-fd-muted-foreground">{String(arg.type)}</code>
                  {isRequiredArgument(arg) && <span className="text-red-400">*</span>}
                </div>
                {arg.description && (
                  <div className="prose-no-margin text-fd-muted-foreground mt-1">
                    <Markdown md={arg.description} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ),
      });
    }

    return tags;
  }

  function buildNamedTags(named: GraphQLNamedType) {
    const tags: { node: ReactNode }[] = [];

    if (isEnumType(named)) {
      tags.push({
        node: (
          <div className={TagCardClass}>
            <p className={`${TagCardTitleClass} px-2 py-1.5`}>{t('Values')}</p>
            <EnumValueList type={named} className="p-2" />
          </div>
        ),
      });
    }

    if (isScalarType(named) && named.specifiedByURL) {
      tags.push({
        node: (
          <InlineTag label={t('Specification')}>
            <a href={named.specifiedByURL} rel="noreferrer noopener" className="underline">
              {named.specifiedByURL}
            </a>
          </InlineTag>
        ),
      });
    }

    if (isInterfaceType(named)) {
      const { objects } = schema.getImplementations(named);

      if (objects.length > 0) {
        tags.push({
          node: (
            <InlineTag label={t('Implemented by')}>
              {objects.map((item) => item.name).join(' | ')}
            </InlineTag>
          ),
        });
      }
    }

    return tags;
  }

  refs.$root = buildData(root.type, {
    description: root.description,
    deprecationReason: root.deprecationReason,
    args: root.args,
    defaultText: printDefaultValue(root.default, root.type as GraphQLInputType),
    directives: getCustomDirectives(root.astNode),
  });

  return { $root: '$root', refs };
}

function printDefaultValue(
  defaultInput: GraphQLDefaultInput | undefined,
  type: GraphQLInputType,
): string | undefined {
  if (!defaultInput) return;
  if (defaultInput.literal) return print(defaultInput.literal);
  if (defaultInput.value === undefined) return;

  try {
    const node = valueToLiteral(defaultInput.value, type);
    if (node) return print(node);
  } catch {
    // fall through
  }

  return JSON.stringify(defaultInput.value);
}
