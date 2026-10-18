'use client';
import { memo, type ReactNode, useDeferredValue, useId, useMemo, useState } from 'react';
import { Braces, RotateCcw, Rows3, Variable, WandSparkles } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import {
  type DocumentNode,
  getNamedType,
  GraphQLError,
  type GraphQLSchema,
  isCompositeType,
  isRequiredArgument,
  parse,
  print,
  validate,
} from 'graphql';
import type { FieldKey } from '@fumari/stf';
import {
  type FieldEntry,
  FieldRow,
  FieldRows,
  type NavigateFn,
} from 'shared-api/components/playground/fields';
import {
  FieldPanel,
  iconButtonClassName,
  type Motion,
  OverviewLayer,
  Section,
  useFieldStack,
} from 'shared-api/components/playground/panels';
import { JsonEditor } from 'shared-api/components/playground/json-editor';
import { Segmented, SegmentedList } from 'shared-api/components/segmented';
import { useOperation } from '@/operation';
import { useGraphQL } from '@/utils/create-page';
import { inputTypeToJsonSchema } from '@/playground/json-schema';
import { type SelectionStep, toggleField } from '@/playground/selection';
import { CodeEditor } from '@/ui/components/code-editor';
import { cn } from '@/utils/cn';
import { Note, SelectionPanel, SelectionSection } from './selection';

const variablesField: FieldKey = ['variables'];

const headersEntry: FieldEntry = {
  fieldName: ['headers'],
  name: 'headers',
  schema: { type: 'object', additionalProperties: { type: 'string' } },
};

/** the inputs of request, nested variables and fields open in panels, locked while subscribed */
export const RequestPanel = memo(function RequestPanel({
  query,
  onQueryChange,
  onReset,
  locked,
  className,
}: Omit<OperationSectionProps, 'document' | 'errors'> & {
  locked: boolean;
  className?: string;
}) {
  const t = useTranslations({ note: 'graphql playground' });
  const { schema } = useGraphQL();
  const { kind, name, field } = useOperation();
  const fields = useFieldStack();
  const onNavigate = fields.openNested([]);
  const [selection, setSelection] = useState<{ path: SelectionStep[]; motion: Motion }>({
    path: [],
    motion: 'forward',
  });
  // validating is expensive, the errors trail the editor at a low priority instead of blocking keystrokes
  const deferredQuery = useDeferredValue(query);
  const { document, errors } = useMemo(
    () => validateQuery(schema, deferredQuery),
    [schema, deferredQuery],
  );
  const selectionProps = {
    document,
    invalid: errors.length > 0 && !document,
    onToggle(path: SelectionStep[], target: string, selected: boolean) {
      onQueryChange(toggleField(schema, query, { kind, name }, path, target, selected));
    },
    onOpen(path: SelectionStep[]) {
      setSelection({
        path,
        motion: path.length >= selection.path.length ? 'forward' : 'back',
      });
    },
  };

  return (
    <div className={cn('@container grid min-h-0', className)}>
      <OverviewLayer covered={fields.stack.length > 0 || selection.path.length > 0}>
        <fieldset disabled={locked} className="contents">
          <OperationSection
            query={query}
            onQueryChange={onQueryChange}
            onReset={onReset}
            document={document}
            errors={errors}
          />
          {isCompositeType(getNamedType(field.type)) && <SelectionSection {...selectionProps} />}
          <VariablesSection onNavigate={onNavigate} />
          <Section icon={Rows3} title={t('Headers')}>
            <FieldRows entry={headersEntry} onNavigate={onNavigate} />
          </Section>
        </fieldset>
      </OverviewLayer>
      {fields.stack.length > 0 && (
        <FieldPanel fields={fields} root={t('Variables')} disabled={locked} />
      )}
      {selection.path.length > 0 && (
        <SelectionPanel
          {...selectionProps}
          path={selection.path}
          motion={selection.motion}
          locked={locked}
        />
      )}
    </div>
  );
});

function validateQuery(
  schema: GraphQLSchema,
  query: string,
): { document?: DocumentNode; errors: readonly GraphQLError[] } {
  if (query.trim().length === 0) return { errors: [] };

  try {
    const document = parse(query);
    return { document, errors: validate(schema, document) };
  } catch (e) {
    return { errors: e instanceof GraphQLError ? [e] : [] };
  }
}

interface OperationSectionProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** load the selected example again */
  onReset: () => void;
  /** the parsed query, it trails the editor */
  document?: DocumentNode;
  errors: readonly GraphQLError[];
}

/** errors listed under the editor, the rest are counted */
const maxErrors = 3;

function OperationSection({
  query,
  onQueryChange,
  onReset,
  document,
  errors,
}: OperationSectionProps) {
  const t = useTranslations({ note: 'graphql playground' });
  const { examples } = useOperation();
  const errorsId = useId();
  const items: ReactNode[] = [];
  for (let i = 0; i < Math.min(errors.length, maxErrors); i++) {
    const { message, locations } = errors[i];

    items.push(
      <li key={i} className="col-span-2 grid grid-cols-subgrid">
        <span className="text-fd-muted-foreground tabular-nums">
          {locations && `${locations[0].line}:${locations[0].column}`}
        </span>
        <span className="text-red-600 dark:text-red-400">{message}</span>
      </li>,
    );
  }

  return (
    <Section
      icon={Braces}
      title={t('Operation')}
      actions={
        <div className="flex items-center @sm:-me-1">
          <button
            type="button"
            title={t('Format')}
            aria-label={t('Format')}
            disabled={!document}
            onClick={() => {
              try {
                onQueryChange(print(parse(query)));
              } catch {
                // edited into an invalid document since it was validated
              }
            }}
            className={iconButtonClassName}
          >
            <WandSparkles />
          </button>
          {examples.length > 0 && (
            <button
              type="button"
              title={t('Reset')}
              aria-label={t('Reset')}
              onClick={onReset}
              className={iconButtonClassName}
            >
              <RotateCcw />
            </button>
          )}
        </div>
      }
    >
      <CodeEditor
        value={query}
        onValueChange={onQueryChange}
        lang="graphql"
        aria-label={t('Operation')}
        aria-invalid={errors.length > 0}
        aria-describedby={errors.length > 0 ? errorsId : undefined}
      />
      {errors.length > 0 && (
        <ul
          id={errorsId}
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t px-4 py-2.5 font-mono text-xs"
        >
          {items}
          {errors.length > maxErrors && (
            <li className="col-start-2 text-fd-muted-foreground">
              {t('+{count} more', { variables: { count: String(errors.length - maxErrors) } })}
            </li>
          )}
        </ul>
      )}
    </Section>
  );
}

function VariablesSection({ onNavigate }: { onNavigate: NavigateFn }) {
  const t = useTranslations({ note: 'graphql playground' });
  const { field } = useOperation();
  const [mode, setMode] = useState('form');
  const entries = useMemo(() => {
    const out: FieldEntry[] = [];
    for (const arg of field.args) {
      out.push({
        fieldName: ['variables', arg.name],
        name: arg.name,
        schema: inputTypeToJsonSchema(arg.type),
        removal: isRequiredArgument(arg) ? undefined : 'unset',
      });
    }

    return out;
  }, [field]);

  let content: ReactNode;
  if (entries.length === 0) {
    content = <Note>{t('This operation has no arguments.')}</Note>;
  } else if (mode === 'json') {
    content = <JsonEditor fieldName={variablesField} />;
  } else {
    content = entries.map((entry, i) => (
      <FieldRow
        key={entry.name}
        entry={entry}
        required={!entry.removal}
        description={field.args[i].description ?? undefined}
        type={String(field.args[i].type)}
        onNavigate={() => onNavigate(entry, entries)}
      />
    ));
  }

  return (
    <Section
      icon={Variable}
      title={t('Variables')}
      actions={
        entries.length > 0 && (
          <Segmented value={mode} onValueChange={setMode} className="@sm:-me-2.5">
            <SegmentedList
              aria-label={t('Editor')}
              items={[
                { value: 'form', label: t('Form') },
                { value: 'json', label: 'JSON' },
              ]}
            />
          </Segmented>
        )
      }
    >
      {content}
    </Section>
  );
}
