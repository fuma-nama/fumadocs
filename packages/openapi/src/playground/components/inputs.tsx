'use client';
import { type ComponentProps, type HTMLAttributes, type ReactNode, useState } from 'react';
import { ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { FieldKey, useArray, useDataEngine, useFieldValue, useObject } from '@fumari/stf';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { Input, labelVariants } from '@/ui/components/input';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { FormatFlags } from '@/utils/schema/to-string';
import {
  anyFields,
  useFieldInfo,
  useSchemaUtils,
  useSchemaScope,
  useResolvedSchema,
} from '@/playground/schema';
import type { ParsedSchema } from '@/utils/schema';
import { stringifyFieldKey } from '@fumari/stf/lib/utils';
import { cva } from 'class-variance-authority';
import { useTranslations } from '@/ui/client/i18n';

const fieldLabelVariants = cva('w-full inline-flex items-center gap-0.5');

function FieldLabelType(props: ComponentProps<'code'>) {
  return (
    <code {...props} className={cn('text-xs text-fd-muted-foreground', props.className)}>
      {props.children}
    </code>
  );
}

export function ObjectInput({
  field: _field,
  fieldName,
  ...props
}: {
  field: Exclude<ParsedSchema, boolean>;
  fieldName: FieldKey;
} & ComponentProps<'div'>) {
  const { generateDefault } = useSchemaUtils();
  const field = useResolvedSchema(_field);
  const schemaPropKeys = field.properties ? Object.keys(field.properties) : [];
  const {
    patternProperties = {},
    additionalProperties,
    'x-playground-lazy': isLazy = schemaPropKeys.length > 100,
  } = field;
  const isDynamic = Object.keys(patternProperties).length > 0 || additionalProperties;

  const [nextName, setNextName] = useState('');
  const { properties, onAppend, onDelete, _objectKeys } = useObject(fieldName, {
    lazy: isLazy,
    defaultValue: () => generateDefault(field) as object,
    properties: field.properties ?? {},
    fallback: additionalProperties,
    patternProperties: patternProperties,
  });

  const hiddenProperties = isLazy ? schemaPropKeys.filter((key) => !_objectKeys.includes(key)) : [];
  const t = useTranslations();

  return (
    <div
      {...props}
      className={cn(
        'grid grid-cols-1 gap-4 @md:grid-cols-2 *:data-[collapsible=true]:order-last',
        props.className,
      )}
    >
      {isLazy && hiddenProperties.length > 0 && (
        <Select value="" onValueChange={onAppend}>
          <SelectTrigger className="col-span-full">
            <SelectValue placeholder={t.playgroundShowProperty} />
          </SelectTrigger>
          <SelectContent>
            {hiddenProperties.map((key) => (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {properties.map((child) => {
        let toolbar: ReactNode = null;
        if (child.kind === 'pattern' || child.kind === 'fallback') {
          toolbar = (
            <button
              type="button"
              aria-label={t.playgroundRemoveItem}
              className={cn(
                buttonVariants({
                  color: 'outline',
                  size: 'icon-xs',
                }),
              )}
              onClick={() => {
                onDelete(child.key);
              }}
            >
              <Trash2 />
            </button>
          );
        }

        return (
          <FieldSet
            key={child.key}
            name={child.key}
            field={child.info}
            fieldName={child.field}
            isRequired={field.required?.includes(child.key)}
            toolbar={toolbar}
          />
        );
      })}
      {isDynamic && (
        <div className="flex gap-2 order-last col-span-full">
          <Input
            value={nextName}
            placeholder={t.playgroundPropertyPlaceholder}
            onChange={(e) => setNextName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setNextName('');
                onAppend(nextName);
                e.preventDefault();
              }
            }}
          />
          <button
            type="button"
            className={cn(buttonVariants({ color: 'secondary', size: 'sm' }), 'px-4')}
            onClick={() => {
              onAppend(nextName);
              setNextName('');
            }}
          >
            {t.playgroundNewProperty}
          </button>
        </div>
      )}
    </div>
  );
}

export function JsonInput({ fieldName }: { fieldName: FieldKey }) {
  const engine = useDataEngine();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(() => JSON.stringify(engine.init(fieldName, {}), null, 2));

  return (
    <div className="flex flex-col bg-fd-secondary text-fd-secondary-foreground overflow-hidden border rounded-lg">
      <textarea
        value={value}
        className="p-2 h-[240px] text-sm font-mono resize-none focus-visible:outline-none"
        onChange={(v) => {
          setValue(v.target.value);
          try {
            engine.update(fieldName, JSON.parse(v.target.value));
            setError(null);
          } catch (e) {
            if (e instanceof Error) setError(e.message);
          }
        }}
      />
      <p className="p-2 text-xs font-mono border-t text-red-400 empty:hidden">{error}</p>
    </div>
  );
}

export function FieldInput({
  field,
  fieldName,
  isRequired,
  ...props
}: HTMLAttributes<HTMLElement> & {
  field: Exclude<ParsedSchema, boolean>;
  isRequired?: boolean;
  fieldName: FieldKey;
}) {
  const [value, setValue] = useFieldValue(fieldName);
  const id = stringifyFieldKey(fieldName);
  const t = useTranslations();
  if (field.type === 'null') return;

  if (field.type === 'string' && field.format === 'binary') {
    return (
      <>
        <label
          htmlFor={id}
          className={cn(
            buttonVariants({
              color: 'secondary',
              className: 'w-full h-9 gap-2 truncate',
            }),
          )}
        >
          {value instanceof File ? (
            <>
              <span className="text-fd-muted-foreground text-xs">{t.playgroundSelected}</span>
              <span className="truncate w-0 flex-1 text-end">{value.name}</span>
            </>
          ) : (
            <span className="text-fd-muted-foreground">{t.playgroundInputUpload}</span>
          )}
        </label>
        <input
          id={id}
          type="file"
          multiple={false}
          onChange={(e) => {
            if (!e.target.files || e.target.files.length === 0) return;
            setValue(e.target.files.item(0));
          }}
          hidden
        />
      </>
    );
  }

  if (field.enum && field.enum.length > 0) {
    const idx = field.enum.indexOf(value);

    return (
      <Select
        value={idx === -1 && isRequired ? '' : String(idx)}
        onValueChange={(v) => setValue(field.enum![Number(v)])}
      >
        <SelectTrigger id={id} {...props}>
          <SelectValue placeholder={t.playgroundSelectPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {field.enum.map((item, i) => (
            <SelectItem key={i} value={String(i)}>
              {typeof item === 'string' ? item : JSON.stringify(item, null, 2)}
            </SelectItem>
          ))}
          {!isRequired && <SelectItem value="-1">{t.playgroundInputUnset}</SelectItem>}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'boolean') {
    return (
      <Select
        value={String(value)}
        onValueChange={(value) => setValue(value === 'undefined' ? undefined : value === 'true')}
      >
        <SelectTrigger id={id} {...props}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">True</SelectItem>
          <SelectItem value="false">False</SelectItem>
          {!isRequired && <SelectItem value="undefined">{t.playgroundInputUnset}</SelectItem>}
        </SelectContent>
      </Select>
    );
  }

  const isNumber = field.type === 'integer' || field.type === 'number';
  return (
    <Input
      id={id}
      placeholder={t.inputPlaceholder}
      type={isNumber ? 'number' : 'text'}
      step={field.type === 'integer' ? 1 : undefined}
      value={String(value ?? '')}
      onChange={(e) => {
        if (isNumber) {
          setValue(Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber);
        } else if (!isNumber) {
          setValue(e.target.value);
        }
      }}
    />
  );
}

export function FieldSet({
  field: _field,
  fieldName,
  toolbar,
  name,
  isRequired,
  depth = 0,
  slotType,
  collapsible = true,
  ...props
}: HTMLAttributes<HTMLElement> & {
  isRequired?: boolean;
  name?: ReactNode;
  field: ParsedSchema;
  fieldName: FieldKey;
  depth?: number;

  slotType?: ReactNode;
  toolbar?: ReactNode;
  collapsible?: boolean;
}) {
  const { readOnly, writeOnly } = useSchemaScope();
  const { generateDefault, schemaToString } = useSchemaUtils();
  const field = useResolvedSchema(_field);
  const [show, setShow] = useState(!collapsible);
  const { info, updateInfo } = useFieldInfo(fieldName, field, depth);
  const id = stringifyFieldKey(fieldName);
  const dataEngine = useDataEngine();
  const [isDefined] = useFieldValue(fieldName, {
    compute(currentValue) {
      return currentValue !== undefined;
    },
  });

  if (_field === false) return;
  if (field.readOnly && !readOnly) return;
  if (field.writeOnly && !writeOnly) return;

  if (collapsible && !isDefined && show) setShow(false);

  function renderLabelTrigger(schema = field) {
    if (!collapsible) return renderLabelName();

    return (
      <button
        type="button"
        className={cn(labelVariants(), 'inline-flex items-center gap-1 font-mono me-auto')}
        onClick={() => {
          dataEngine.init(fieldName, generateDefault(schema));
          setShow((prev) => !prev);
        }}
      >
        <ChevronRight className={cn('size-3.5 text-fd-muted-foreground', show && 'rotate-90')} />
        {name}
        {isRequired && <span className="text-red-400/80">*</span>}
      </button>
    );
  }

  function renderLabelName() {
    return (
      <span className={cn(labelVariants(), 'font-mono me-auto')}>
        {name}
        {isRequired && <span className="text-red-400/80 mx-1">*</span>}
      </span>
    );
  }

  function renderUnsetButton() {
    return (
      <button
        type="button"
        onClick={() => dataEngine.delete(fieldName)}
        className="text-fd-muted-foreground hover:text-fd-accent-foreground"
      >
        <X className="size-3.5" />
      </button>
    );
  }

  if (info.unionField && field[info.unionField] && field[info.unionField]!.length > 0) {
    const union = field[info.unionField]!;
    const showSelect = union.length > 1;

    return (
      <FieldSet
        {...props}
        name={name}
        fieldName={fieldName}
        isRequired={isRequired}
        field={union[info.oneOf]}
        depth={depth + 1}
        slotType={showSelect ? false : slotType}
        collapsible={collapsible}
        toolbar={
          <>
            {showSelect && (
              <select
                className="text-xs font-mono"
                value={info.oneOf}
                onChange={(e) => {
                  updateInfo({
                    oneOf: Number(e.target.value),
                  });
                }}
              >
                {union.map((item, i) => (
                  <option key={i} value={i} className="bg-fd-popover text-fd-popover-foreground">
                    {schemaToString(item, FormatFlags.UseAlias)}
                  </option>
                ))}
              </select>
            )}
            {toolbar}
          </>
        }
      />
    );
  }

  if (Array.isArray(field.type)) {
    const showSelect = field.type.length > 1;

    return (
      <FieldSet
        {...props}
        name={name}
        fieldName={fieldName}
        isRequired={isRequired}
        field={{
          ...field,
          type: info.selectedType,
        }}
        collapsible={collapsible}
        depth={depth + 1}
        slotType={showSelect ? false : slotType}
        toolbar={
          <>
            {showSelect && (
              <select
                className="text-xs font-mono"
                value={info.selectedType}
                onChange={(e) => {
                  updateInfo({
                    selectedType: e.target.value,
                  });
                }}
              >
                {field.type.map((item) => (
                  <option
                    key={item}
                    value={item}
                    className="bg-fd-popover text-fd-popover-foreground"
                  >
                    {item}
                  </option>
                ))}
              </select>
            )}
            {toolbar}
          </>
        }
      />
    );
  }

  if (field.type === 'object') {
    return (
      <fieldset
        {...props}
        data-collapsible={collapsible}
        className={cn('flex flex-col gap-1.5 col-span-full @container', props.className)}
      >
        <div className={fieldLabelVariants()}>
          {renderLabelTrigger(field)}
          {slotType ?? <FieldLabelType>{schemaToString(field)}</FieldLabelType>}
          {toolbar}
          {!isRequired && isDefined && renderUnsetButton()}
        </div>
        {show && (
          <ObjectInput
            field={field}
            fieldName={fieldName}
            className="rounded-lg border border-fd-primary/20 bg-fd-background/50 p-2 shadow-sm"
          />
        )}
      </fieldset>
    );
  }

  if (field.type === 'array') {
    return (
      <fieldset
        {...props}
        data-collapsible={collapsible}
        className={cn('flex flex-col gap-1.5 col-span-full', props.className)}
      >
        <div className={fieldLabelVariants()}>
          {renderLabelTrigger()}
          {slotType ?? <FieldLabelType>{schemaToString(field)}</FieldLabelType>}
          {toolbar}
          {!isRequired && isDefined && renderUnsetButton()}
        </div>
        {show && (
          <ArrayInput
            fieldName={fieldName}
            items={field.items ?? anyFields}
            className="rounded-lg border border-fd-primary/20 bg-fd-background/50 p-2 shadow-sm"
          />
        )}
      </fieldset>
    );
  }

  return (
    <fieldset {...props} className={cn('flex flex-col gap-1.5', props.className)}>
      <label className={fieldLabelVariants()} htmlFor={id}>
        {renderLabelName()}
        {slotType ?? <FieldLabelType>{schemaToString(field)}</FieldLabelType>}
        {toolbar}
        {!isRequired && isDefined && renderUnsetButton()}
      </label>
      <FieldInput field={field} fieldName={fieldName} isRequired={isRequired} />
    </fieldset>
  );
}

function ArrayInput({
  fieldName,
  items: itemSchema,
  ...props
}: {
  fieldName: FieldKey;
  items: ParsedSchema;
} & ComponentProps<'div'>) {
  const name = fieldName.at(-1) ?? '';
  const { generateDefault } = useSchemaUtils();
  const { items, insertItem, removeItem } = useArray(fieldName);
  const t = useTranslations();

  return (
    <div {...props} className={cn('flex flex-col gap-2', props.className)}>
      {items.map((item) => (
        <FieldSet
          key={item.index}
          name={
            <span className="text-fd-muted-foreground">
              {name}[{item.index}]
            </span>
          }
          field={itemSchema}
          isRequired
          fieldName={item.field}
          toolbar={
            <button
              type="button"
              aria-label={t.playgroundRemoveItem}
              className={cn(
                buttonVariants({
                  color: 'outline',
                  size: 'icon-xs',
                }),
              )}
              onClick={() => removeItem(item.index)}
            >
              <Trash2 />
            </button>
          }
        />
      ))}
      <button
        type="button"
        className={cn(
          buttonVariants({
            color: 'secondary',
            className: 'gap-1.5 py-2',
            size: 'sm',
          }),
        )}
        onClick={() => {
          insertItem(generateDefault(itemSchema));
        }}
      >
        <Plus className="size-4" />
        {t.playgroundNewItem}
      </button>
    </div>
  );
}
