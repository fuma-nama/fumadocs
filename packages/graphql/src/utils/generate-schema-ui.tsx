import type { ReactNode } from 'react';
import {
  type DirectiveNode,
  getNamedType,
  type GraphQLArgument,
  type GraphQLEnumType,
  type GraphQLInputType,
  type GraphQLNamedType,
  type GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isNonNullType,
  isObjectType,
  isRequiredInputField,
  isScalarType,
  isSpecifiedScalarType,
  isUnionType,
} from 'graphql';
import { fromTranslations } from '@fuma-translate/react';
import type { InfoTag, SchemaData, SchemaUIGeneratedData } from '@fumadocs/json-schema/react';
import { getCustomDirectives } from '@/utils/schema';
import { printDefaultValue } from '@/utils/sdl';
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
  // a UI only reads the schemas it shows
  const refs = new Proxy<Record<string, SchemaData>>(
    {},
    {
      get(generated, key) {
        if (typeof key === 'string' && !Object.hasOwn(generated, key)) {
          const data = generate(key);
          if (data) generated[key] = data;
        }
        return Reflect.get(generated, key);
      },
    },
  );

  /** keys are `$root`, the names of union members, and `Parent.field` */
  function generate(key: string): SchemaData | undefined {
    // an empty description leaves the type to the page, like type pages
    if (key === '$root') return buildData(root, root.description !== '');

    const [name, fieldName] = key.split('.');
    const type = schema.getType(name);
    if (fieldName === undefined) return type ? buildData({ type }) : undefined;
    if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
      const field = type.getFields()[fieldName];
      if (field) return buildData(field);
    }
  }

  /** `namedTags` is false when the page documents the named type */
  function buildData(field: SchemaViewRoot, namedTags = true): SchemaData {
    const named = getNamedType(field.type);
    // built-in scalars are described by the spec rather than the schema
    const description =
      field.description ?? (isSpecifiedScalarType(named) ? undefined : named.description);
    const base = {
      typeName: named.name,
      // wrappers collapse into the named type, the annotation (e.g. `[User!]!`) shows them
      aliasName: String(field.type),
      deprecated: field.deprecationReason != null,
      description: description ? renderMarkdown(description) : undefined,
      infoTags: namedTags
        ? [...buildFieldTags(field), ...buildNamedTags(named)]
        : buildFieldTags(field),
    };

    if (isUnionType(named)) {
      return {
        ...base,
        type: 'or',
        items: named.getTypes().map((item) => ({ name: item.name, $type: item.name })),
      };
    }

    if (isInputObjectType(named)) {
      return {
        ...base,
        type: 'object',
        props: Object.values(named.getFields()).map((item) => ({
          name: item.name,
          $type: `${named.name}.${item.name}`,
          required: !named.isOneOf && isRequiredInputField(item),
        })),
      };
    }

    if (isObjectType(named) || isInterfaceType(named)) {
      return {
        ...base,
        type: 'object',
        props: Object.values(named.getFields()).map((item) => ({
          name: item.name,
          $type: `${named.name}.${item.name}`,
          required: isNonNullType(item.type),
        })),
      };
    }

    return { ...base, type: 'primitive' };
  }

  function buildFieldTags(field: SchemaViewRoot): InfoTag[] {
    const tags: InfoTag[] = [];
    const defaultText = printDefaultValue(field.default, field.type as GraphQLInputType);
    const directives = getCustomDirectives(field.astNode);

    if (field.deprecationReason) {
      tags.push({
        label: t('Deprecated'),
        value: renderMarkdown(field.deprecationReason),
        prose: true,
      });
    }

    if (defaultText !== undefined) {
      tags.push({ label: t('Default'), value: defaultText });
    }

    if (directives.length > 0) {
      tags.push({ node: renderDirectives(directives) });
    }

    if (field.args && field.args.length > 0) {
      tags.push({ node: renderArguments(field.args) });
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

    if (isInputObjectType(named) && named.isOneOf) {
      tags.push({
        node: <p className="not-prose w-full text-xs">{t('Exactly one field must be set.')}</p>,
      });
    }

    if (isInterfaceType(named)) {
      const { objects } = schema.getImplementations(named);

      if (objects.length > 0) {
        tags.push({ label: t('Implemented by'), list: objects.map((item) => item.name) });
      }
    }

    return tags;
  }

  return { $root: '$root', refs };
}
