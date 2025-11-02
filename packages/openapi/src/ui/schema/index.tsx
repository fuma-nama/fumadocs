import { generateSchemaUI, type SchemaUIOptions } from '@/ui/schema/server';
import {
  SchemaUI,
  type SchemaUIProps,
  SchemaUIProvider,
} from '@/ui/schema/client';

export function Schema(
  props: SchemaUIOptions &
    SchemaUIProps & {
      readOnly?: boolean;
      writeOnly?: boolean;
    },
) {
  const data = generateSchemaUI(props);

  return (
    <SchemaUIProvider
      value={{
        ...data,
        readOnly: props.readOnly,
        writeOnly: props.writeOnly,
      }}
    >
      <SchemaUI name={props.name} required={props.required} as={props.as} />
    </SchemaUIProvider>
  );
}
