import type { ReactNode } from 'react';
import {
  type DirectiveNode,
  getNamedType,
  type GraphQLArgument,
  type GraphQLEnumType,
  type GraphQLInputType,
  type GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isNonNullType,
  isObjectType,
  isRequiredArgument,
  isRequiredInputField,
  isScalarType,
  isSpecifiedScalarType,
  isUnionType,
  resolveSchemaCoordinate,
} from 'graphql';
import { ArrowUpRightIcon } from 'lucide-react';
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
  renderEnumValues: (type: GraphQLEnumType) => ReactNode;
}

/** a type, field, input field or argument */
type FieldLike = SchemaViewRoot & { name?: string; args?: readonly GraphQLArgument[] };

/**
 * Generate the data of the Schema UI for a field-like root, or a schema coordinate like `Query.orders`.
 *
 * Schemas are keyed by schema coordinates: `Customer` for a union member, `Customer.orders` for a field,
 * `Customer.orders()` for its arguments and `Customer.orders(status:)` for one of them.
 */
export function generateGraphQLSchemaUI(
  schema: GraphQLSchema,
  root: SchemaViewRoot | string,
  {
    translations = {},
    renderMarkdown,
    renderDirectives,
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

  function generate(key: string): SchemaData | undefined {
    // an empty description leaves the type to the page, like type pages
    if (key === '$root' && typeof root === 'object')
      return buildData(root, undefined, root.description === '');

    const coordinate = key.endsWith('()') ? key.slice(0, -2) : key;
    let element;
    try {
      element = resolveSchemaCoordinate(schema, coordinate);
    } catch {
      return;
    }

    if (coordinate !== key) {
      if (element?.kind === 'Field') return buildArguments(coordinate, element.field.args);
      return;
    }

    switch (element?.kind) {
      case 'NamedType':
        return buildData({ type: element.type });
      case 'Field':
        return buildData(element.field, key);
      case 'InputField':
        return buildData(element.inputField);
      case 'FieldArgument':
        return buildData(element.fieldArgument);
    }
  }

  /**
   * @param coordinate - the schema coordinate of a field, its arguments open from it
   * @param documented - the page documents the named type
   */
  function buildData(field: FieldLike, coordinate?: string, documented = false): SchemaData {
    const named = getNamedType(field.type);
    // built-in scalars are described by the spec rather than the schema
    const description =
      field.description ?? (isSpecifiedScalarType(named) ? undefined : named.description);
    const defaultText = printDefaultValue(field.default, field.type as GraphQLInputType);
    const directives = getCustomDirectives(field.astNode);
    const tags: InfoTag[] = [];

    // the row labels it deprecated, the reason reads in the same tone
    if (field.deprecationReason) {
      tags.push({
        node: (
          <div className="w-full prose-no-margin text-yellow-700 dark:text-yellow-400">
            {renderMarkdown(field.deprecationReason)}
          </div>
        ),
      });
    }

    if (defaultText !== undefined) {
      tags.push({ label: t('Default'), value: defaultText });
    }

    if (directives.length > 0) {
      tags.push({ node: renderDirectives(directives) });
    }

    if (coordinate && field.args && field.args.length > 0) {
      let names = '';
      for (const arg of field.args) names += names ? `, ${arg.name}` : arg.name;
      tags.push({
        label: t('Arguments'),
        value: names,
        open: { name: `${field.name}(…)`, $ref: `${coordinate}()` },
      });
    }

    if (isEnumType(named)) {
      tags.push({ node: renderEnumValues(named) });
    }

    if (isScalarType(named) && named.specifiedByURL) {
      tags.push({
        node: (
          <a
            href={named.specifiedByURL}
            target="_blank"
            rel="noreferrer noopener"
            title={named.specifiedByURL}
            className="not-prose group/spec inline-flex items-center gap-1.5 rounded-md border bg-fd-secondary px-1.5 py-0.5 text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
          >
            {t('Specification')}
            <ArrowUpRightIcon className="size-3 transition-transform duration-200 group-hover/spec:-translate-y-px group-hover/spec:translate-x-px motion-reduce:transition-none" />
          </a>
        ),
      });
    }

    if (isInputObjectType(named) && named.isOneOf) {
      tags.push({ label: t('Exactly one of'), list: Object.keys(named.getFields()) });
    }

    // type pages list the implementations in their usages
    if (isInterfaceType(named) && !documented) {
      const { objects } = schema.getImplementations(named);

      if (objects.length > 0) {
        tags.push({ label: t('Implemented by'), list: objects.map((item) => item.name) });
      }
    }

    const base = {
      typeName: named.name,
      // wrappers collapse into the named type, the annotation (e.g. `[User!]!`) shows them
      aliasName: String(field.type),
      deprecated: field.deprecationReason != null,
      description: description ? renderMarkdown(description) : undefined,
      infoTags: tags,
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

  /** the arguments of a field as an object */
  function buildArguments(coordinate: string, args: readonly GraphQLArgument[]): SchemaData {
    return {
      type: 'object',
      typeName: coordinate,
      aliasName: coordinate,
      props: args.map((arg) => ({
        name: arg.name,
        $type: `${coordinate}(${arg.name}:)`,
        required: isRequiredArgument(arg),
      })),
    };
  }

  return { $root: typeof root === 'string' ? root : '$root', refs };
}
