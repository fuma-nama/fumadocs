'use client';
import { type ReactNode, useId } from 'react';
import { ListTree } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import {
  type DocumentNode,
  getNamedType,
  type GraphQLField,
  type GraphQLNamedType,
  type GraphQLSchema,
  isAbstractType,
  isCompositeType,
  isInterfaceType,
  isObjectType,
  isRequiredArgument,
} from 'graphql';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { CheckRow, FieldInfo, NavButton, Row } from 'shared-api/components/playground/fields';
import {
  Crumb,
  crumbClassName,
  type Motion,
  Panel,
  PanelNav,
  Section,
} from 'shared-api/components/playground/panels';
import { useOperation } from '@/operation';
import { useGraphQL } from '@/utils/create-page';
import { Markdown } from '@/ui/components/markdown';
import {
  findOperation,
  readSelection,
  type SelectionLevel,
  type SelectionStep,
} from '@/playground/selection';
import { cn } from '@/utils/cn';

export interface SelectionProps {
  /** the parsed query, `undefined` when it is empty or can't be parsed */
  document?: DocumentNode;
  /** the query can't be parsed */
  invalid: boolean;
  onToggle: (path: SelectionStep[], field: string, selected: boolean) => void;
  onOpen: (path: SelectionStep[]) => void;
}

/** the fields selected from the root field, nested levels open in panels */
export function SelectionSection(props: SelectionProps) {
  const t = useTranslations({ note: 'graphql playground' });
  const { kind, name, field } = useOperation();
  const level = props.document && readSelection(props.document, { kind, name }, []);

  return (
    <Section
      icon={ListTree}
      title={t('Fields')}
      actions={
        <code className="me-0.5 min-w-0 truncate text-xs text-fd-muted-foreground">
          {String(field.type)}
        </code>
      }
    >
      <SelectionRows {...props} path={[]} level={level} />
    </Section>
  );
}

/** a nested level over the overview, its breadcrumbs go back up */
export function SelectionPanel({
  path,
  motion,
  locked,
  onNavigate,
  ...props
}: SelectionProps & {
  path: SelectionStep[];
  motion: Motion;
  locked: boolean;
  onNavigate: (path: SelectionStep[]) => void;
}) {
  const t = useTranslations({ note: 'graphql playground' });
  const { schema } = useGraphQL();
  const { kind, name, field } = useOperation();
  const last = path[path.length - 1];
  const parent = path.slice(0, -1);
  const level = props.document && readSelection(props.document, { kind, name }, path);
  let description: string | null | undefined;
  if ('on' in last) {
    description = schema.getType(last.on)?.description;
  } else {
    const type = getLevelType(schema, getNamedType(field.type), parent);
    if (isObjectType(type) || isInterfaceType(type))
      description = type.getFields()[last.field]?.description;
  }
  const labels = path.map((step) => ('on' in step ? `on ${step.on}` : step.field));

  return (
    <Panel
      id={labels.join('/')}
      motion={motion}
      nav={
        <PanelNav
          root={t('Fields')}
          onRoot={() => onNavigate([])}
          onBack={() => onNavigate(parent)}
          end={
            'field' in last &&
            level && (
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  props.onToggle(parent, last.field, false);
                  onNavigate(parent);
                }}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'ms-auto shrink-0 text-fd-muted-foreground',
                )}
              >
                {t('Deselect')}
              </button>
            )
          }
        >
          {labels.map((label, i) => (
            <Crumb key={i}>
              {i < labels.length - 1 ? (
                <button
                  type="button"
                  onClick={() => onNavigate(path.slice(0, i + 1))}
                  className={cn(crumbClassName, 'font-mono')}
                >
                  {label}
                </button>
              ) : (
                <span aria-current="page" className="truncate px-1.5 py-1 font-mono font-medium">
                  {label}
                </span>
              )}
            </Crumb>
          ))}
        </PanelNav>
      }
    >
      {description && (
        <div className="border-b px-4 py-2.5 text-xs text-fd-muted-foreground [&_a]:underline">
          <Markdown md={description} />
        </div>
      )}
      <fieldset disabled={locked} className="contents">
        <SelectionRows {...props} path={path} level={level} />
      </fieldset>
    </Panel>
  );
}

/** the composite type at `path` from the root field */
function getLevelType(schema: GraphQLSchema, root: GraphQLNamedType, path: SelectionStep[]) {
  let type: GraphQLNamedType | undefined = root;
  for (const step of path) {
    if ('on' in step) type = schema.getType(step.on);
    else if (isObjectType(type) || isInterfaceType(type))
      type = getNamedType(type.getFields()[step.field]?.type);
    else return;
  }

  return isCompositeType(type) ? type : undefined;
}

function SelectionRows({
  document,
  invalid,
  path,
  level,
  onToggle,
  onOpen,
}: SelectionProps & {
  path: SelectionStep[];
  /** the selection at `path` */
  level?: SelectionLevel;
}) {
  const t = useTranslations({ note: 'graphql playground' });
  const { schema } = useGraphQL();
  const { kind, name, field } = useOperation();
  const operation = { kind, name };
  if (invalid) return <Note>{t('Fix the query to pick fields.')}</Note>;
  if (!document || !findOperation(document, operation))
    return (
      <Note>
        {t.jsx('Write an operation that selects {field} to pick its fields.', {
          variables: { field: <code>{name}</code> },
        })}
      </Note>
    );

  const type = getLevelType(schema, getNamedType(field.type), path);
  if (!type) return null;
  const rows: ReactNode[] = [];

  if (isObjectType(type) || isInterfaceType(type)) {
    for (const item of Object.values(type.getFields())) {
      const selected = level?.fields.has(item.name) ?? false;
      const next = [...path, { field: item.name }];
      const composite = isCompositeType(getNamedType(item.type));

      rows.push(
        <FieldRow
          key={item.name}
          field={item}
          composite={composite}
          selected={selected}
          via={level?.spread.get(item.name)}
          selection={composite && selected ? readSelection(document, operation, next) : undefined}
          onToggle={(value) => onToggle(path, item.name, value)}
          onOpen={() => onOpen(next)}
        />,
      );
    }
  }

  if (isAbstractType(type)) {
    rows.push(
      <CheckRow
        key="__typename"
        name="__typename"
        type="String!"
        checked={level?.fields.has('__typename') ?? false}
        onCheckedChange={(value) => onToggle(path, '__typename', value)}
      />,
    );

    for (const possible of schema.getPossibleTypes(type)) {
      const next = [...path, { on: possible.name }];
      const selection = level?.fragments.has(possible.name)
        ? readSelection(document, operation, next)
        : undefined;

      rows.push(
        <NavRow key={possible.name} name={`on ${possible.name}`} onClick={() => onOpen(next)}>
          <Preview selection={selection} />
        </NavRow>,
      );
    }
  }

  return rows;
}

function FieldRow({
  field,
  composite,
  selected,
  via,
  selection,
  onToggle,
  onOpen,
}: {
  field: GraphQLField<unknown, unknown>;
  composite: boolean;
  /** selected directly */
  selected: boolean;
  /** the named fragment selecting it */
  via?: string;
  /** the selection of a composite field */
  selection?: SelectionLevel;
  onToggle: (selected: boolean) => void;
  onOpen: () => void;
}) {
  const t = useTranslations({ note: 'graphql playground' });
  const type = String(field.type);
  const deprecated = field.deprecationReason != null;
  let hint: string | undefined;
  // fragments are edited in the editor, the picker only adds fields without arguments
  if (!selected && via) hint = t('via {fragment}', { variables: { fragment: via } });
  else if (!selected && field.args.some(isRequiredArgument)) hint = t('Requires arguments');
  const info = (
    <FieldInfo name={field.name} type={type} description={field.description ?? undefined} />
  );

  if (composite) {
    return (
      <NavRow
        name={field.name}
        info={info}
        type={type}
        disabled={hint !== undefined}
        deprecated={deprecated}
        onClick={onOpen}
      >
        {hint ? (
          <span className="text-fd-muted-foreground">{hint}</span>
        ) : (
          <Preview selection={selection} />
        )}
      </NavRow>
    );
  }

  return (
    <CheckRow
      name={field.name}
      info={info}
      type={type}
      checked={selected || via !== undefined}
      disabled={hint !== undefined}
      deprecated={deprecated}
      onCheckedChange={onToggle}
    >
      {hint}
    </CheckRow>
  );
}

/** opens a nested level */
function NavRow({
  name,
  info,
  type,
  disabled = false,
  deprecated,
  onClick,
  children,
}: {
  name: string;
  info?: ReactNode;
  type?: string;
  disabled?: boolean;
  deprecated?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <Row name={name} htmlFor={id} info={info} readOnly={disabled} deprecated={deprecated}>
      <NavButton id={id} type={type} disabled={disabled} onClick={onClick}>
        {children}
      </NavButton>
    </Row>
  );
}

/** the selection of a level, like `{ id, name, … }` */
function Preview({ selection }: { selection?: SelectionLevel }) {
  const t = useTranslations({ note: 'graphql playground' });
  let text = t('Not selected');
  if (selection) {
    const items: string[] = [];
    for (const name of selection.fields) items.push(name);
    for (const on of selection.fragments) items.push(`on ${on}`);
    for (const fragment of new Set(selection.spread.values())) items.push(`...${fragment}`);
    text = `{ ${items.slice(0, 3).join(', ')}${items.length > 3 ? ', …' : ''} }`;
  }

  return (
    <span
      className={cn(
        'font-mono text-xs',
        selection ? 'text-fd-muted-foreground' : 'text-fd-muted-foreground/70',
      )}
    >
      {text}
    </span>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-xs text-fd-muted-foreground">{children}</p>;
}
