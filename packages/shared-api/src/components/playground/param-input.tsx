'use client';
import { type FieldKey, useFieldValue } from '@fumari/stf';
import type { JsonSchema } from '@fumadocs/json-schema';
import { useResolvedSchema } from './schema';
import { cn } from '@/utils/cn';

const className =
  'mx-px rounded-md bg-fd-primary/10 px-1.5 py-0.5 text-fd-primary outline-none transition-colors placeholder:text-fd-primary/50 hover:bg-fd-primary/15 focus-visible:bg-fd-primary/15 focus-visible:ring-2 focus-visible:ring-fd-primary/30';

/** a parameter of a URL edited in place, like `{id}` of `/users/{id}` */
export function ParamInput({
  fieldName,
  name,
  schema = true,
  description,
}: {
  fieldName: FieldKey;
  name: string;
  schema?: JsonSchema;
  description?: string;
}) {
  const resolved = useResolvedSchema(schema);
  const [value, setValue] = useFieldValue(fieldName);
  const text = value == null ? '' : String(value);

  if (resolved.enum && resolved.enum.length > 0) {
    const options = resolved.enum;

    return (
      <select
        aria-label={name}
        title={description}
        value={String(options.indexOf(value))}
        onChange={(e) => setValue(options[Number(e.target.value)])}
        className={cn(className, 'cursor-pointer appearance-none')}
      >
        <option value="-1" disabled className="bg-fd-popover text-fd-popover-foreground">
          {name}
        </option>
        {options.map((item, i) => (
          <option key={i} value={i} className="bg-fd-popover text-fd-popover-foreground">
            {String(item)}
          </option>
        ))}
      </select>
    );
  }

  const isNumber = resolved.type === 'integer' || resolved.type === 'number';
  return (
    <input
      aria-label={name}
      title={description}
      value={text}
      placeholder={name}
      autoComplete="off"
      spellCheck={false}
      inputMode={isNumber ? 'decimal' : undefined}
      onChange={(e) => {
        const v = e.target.value;
        if (v.length === 0) setValue(undefined);
        else setValue(isNumber && !Number.isNaN(Number(v)) ? Number(v) : v);
      }}
      style={{ width: `calc(${Math.max(text.length, name.length, 1)}ch + 0.75rem)` }}
      className={className}
    />
  );
}
