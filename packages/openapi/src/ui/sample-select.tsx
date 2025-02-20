import { createContext, use, useState } from 'react';
import type { SampleProps, SamplesProps } from '@/render/renderer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';

const ActiveSampleContext = createContext('');

export function Samples({
  items,
  defaultValue = items[0].value,
  children,
}: SamplesProps) {
  const [value, setValue] = useState('');
  const active = value === '' ? defaultValue : value;
  const defaultItem = items.find((item) => item.value === defaultValue);

  return (
    <>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="not-prose mb-2">
          <SelectValue
            placeholder={
              defaultItem ? <SelectDisplay {...defaultItem} /> : null
            }
          />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              <SelectDisplay {...item} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ActiveSampleContext value={active}>{children}</ActiveSampleContext>
    </>
  );
}

function SelectDisplay(item: SamplesProps['items'][number]) {
  return (
    <>
      <span className="font-medium text-sm">{item.title}</span>
      <span className="text-fd-muted-foreground">{item.description}</span>
    </>
  );
}

export function Sample({ value, children }: SampleProps) {
  const active = use(ActiveSampleContext);
  if (value !== active) return;

  return children;
}
