'use client';
import { createContext, Fragment, type ReactNode, use } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'fumadocs-ui/components/tabs';
import type { SchemaUIData } from '@/render/schema/server';
import { ObjectCollapsible, Property } from './ui';

interface UIContext extends SchemaUIData {
  readOnly?: boolean;
  writeOnly?: boolean;
}

const Context = createContext<UIContext | null>(null);

export function SchemaUIProvider(props: {
  value: UIContext;
  children: ReactNode;
}) {
  return <Context value={props.value}>{props.children}</Context>;
}

function useData() {
  return use(Context)!;
}

export interface SchemaUIProps {
  name: string;
  required?: boolean;
  as?: 'property' | 'body';
}

export function SchemaUI({
  name,
  required = false,
  as = 'property',
}: SchemaUIProps) {
  const { $root } = useData();

  return (
    <SchemaUIProperty
      name={name}
      $type={$root}
      required={required}
      variant={as === 'property' ? 'default' : 'ghost'}
    />
  );
}

function SchemaUIProperty({
  $type,
  variant = 'default',
  nested = false,
  ...rest
}: {
  name: string;
  $type: string;
  required?: boolean;
  variant?: 'default' | 'ghost';
  nested?: boolean;
}) {
  const { refs, readOnly, writeOnly } = useData();
  const schema = refs[$type];

  if ((schema.readOnly && !readOnly) || (schema.writeOnly && !writeOnly))
    return;

  let child = (
    <>
      {schema.description}
      <div className="flex flex-row gap-2 flex-wrap">
        {schema.infoTags?.map((tag, i) => (
          <Fragment key={i}>{tag}</Fragment>
        ))}
      </div>
    </>
  );

  if (schema.type === 'or' && schema.items.length > 0) {
    const items = schema.items;

    child = (
      <>
        {child}
        <Tabs>
          <TabsList>
            {items.map((item) => (
              <TabsTrigger key={item.$type} value={item.$type}>
                {item.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {items.map((item) => (
            <TabsContent
              key={item.$type}
              value={item.$type}
              forceMount={undefined}
            >
              <SchemaUIProperty variant="ghost" {...item} />
            </TabsContent>
          ))}
        </Tabs>
      </>
    );
  }

  if (schema.type === 'object' && schema.props.length > 0) {
    child = (
      <>
        {child}
        {variant === 'ghost' ? (
          schema.props.map((prop) => (
            <SchemaUIProperty key={prop.name} {...prop} nested={nested} />
          ))
        ) : (
          <ObjectCollapsible name="Show Attributes">
            {schema.props.map((prop) => (
              <SchemaUIProperty key={prop.name} {...prop} nested />
            ))}
          </ObjectCollapsible>
        )}
      </>
    );
  }

  if (schema.type === 'array') {
    const item = schema.item;

    child = (
      <>
        {child}
        <ObjectCollapsible name="Array item">
          <SchemaUIProperty name="item" {...item} variant="ghost" nested />
        </ObjectCollapsible>
      </>
    );
  }

  if (variant === 'ghost') return child;

  return (
    <Property
      type={schema.typeName}
      deprecated={schema.deprecated}
      nested={nested}
      {...rest}
    >
      {child}
    </Property>
  );
}
