import type { ReactNode } from 'react';
import {
  type DirectiveNode,
  type FieldDefinitionNode,
  getNamedType,
  type GraphQLArgument,
  type GraphQLDefaultInput,
  type GraphQLEnumType,
  type GraphQLInputType,
  type GraphQLNamedType,
  type GraphQLSchema,
  type GraphQLType,
  type InputValueDefinitionNode,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isRequiredInputField,
  isScalarType,
  isUnionType,
  print,
  valueToLiteral,
} from 'graphql';
import { fromTranslations } from '@fuma-translate/react';
import type { InfoTag, SchemaData, SchemaUIGeneratedData } from '@fumadocs/json-schema/react';
import { getCustomDirectives } from '@/utils/schema';
import type { SchemaViewRoot } from '@/utils/create-page';

export interface GenerateGraphQLSchemaUIOptions {
  translations?: Partial<Record<string, string>>;
  renderMarkdown: (md: string) => ReactNode;
  /** the custom directives of a type, field or argument */
  renderDirectives: (directives: readonly DirectiveNode[]) => ReactNode;
  /** the arguments of a field */
  renderArguments: (args: readonly GraphQLArgument[]) => ReactNode;
  renderEnumValues: (type: GraphQLEnumType) => ReactNode;
}

interface DocInfo {
  description?: string | null;
  deprecationReason?: string | null;
  args?: readonly GraphQLArgument[];
  defaultText?: string;
  directives?: readonly DirectiveNode[];
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

/**
 * Generate the data of the Schema UI for a type, field or argument of the schema.
 */
export function generateGraphQLSchemaUI(
  schema: GraphQLSchema,
  root: SchemaViewRoot,
  {
    translations = {},
    renderMarkdown,
    renderDirectives,
    renderArguments,
    renderEnumValues,
  }: GenerateGraphQLSchemaUIOptions,
): SchemaUIGeneratedData {
  const t = fromTranslations(translations, { note: 'graphql schema ui' });
  const refs: Record<string, SchemaData> = {};

  function ensureType(type: GraphQLType): string {
    const key = String(type);
    if (key in refs) return key;

    const data = {} as SchemaData;
    // register before recursion to guard against cyclic references
    refs[key] = data;
    Object.assign(data, buildData(type, {}));
    return key;
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
    const description = doc.description ?? named.description;
    const base = {
      typeName: named.name,
      aliasName: String(type),
      deprecated: doc.deprecationReason != null,
      description: description ? renderMarkdown(description) : undefined,
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

  function buildDocTags(doc: DocInfo): InfoTag[] {
    const tags: InfoTag[] = [];

    if (doc.deprecationReason) {
      tags.push({
        label: t('Deprecated'),
        value: renderMarkdown(doc.deprecationReason),
        prose: true,
      });
    }

    if (doc.defaultText !== undefined) {
      tags.push({ label: t('Default'), value: doc.defaultText });
    }

    if (doc.directives && doc.directives.length > 0) {
      tags.push({ node: renderDirectives(doc.directives) });
    }

    if (doc.args && doc.args.length > 0) {
      tags.push({ node: renderArguments(doc.args) });
    }

    return tags;
  }

  function buildNamedTags(named: GraphQLNamedType): InfoTag[] {
    const tags: InfoTag[] = [];

    if (isEnumType(named)) {
      tags.push({ node: renderEnumValues(named) });
    }

    if (isScalarType(named) && named.specifiedByURL) {
      tags.push({
        label: t('Specification'),
        value: (
          <a href={named.specifiedByURL} rel="noreferrer noopener" className="underline">
            {named.specifiedByURL}
          </a>
        ),
      });
    }

    if (isInterfaceType(named)) {
      const { objects } = schema.getImplementations(named);

      if (objects.length > 0) {
        tags.push({
          label: t('Implemented by'),
          value: objects.map((item) => item.name).join(' | '),
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
