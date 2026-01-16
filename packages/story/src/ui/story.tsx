'use client';

import { TypeNode } from '@/types';
import { FieldSet } from './arg-form';
import { FC, useRef, useState } from 'react';
import { StfProvider, useDataEngine, useListener, useStf } from '@fumari/stf';

export function Story({ argTypes, Component }: { argTypes: TypeNode; Component: FC }) {
  const stf = useStf({
    defaultValues: {},
  });

  return (
    <StfProvider value={stf}>
      <div className="not-prose">
        <StoryComponent Component={Component} />
        <FieldSet
          field={argTypes}
          fieldName={[]}
          name="Props"
          className="max-h-[600px] overflow-auto"
        />
      </div>
    </StfProvider>
  );
}

function StoryComponent({ Component }: { Component: FC }) {
  const engine = useDataEngine();
  const timerRef = useRef(0);
  const [args, setArgs] = useState(() => engine.getData());
  useListener({
    onUpdate() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setArgs({ ...engine.getData() }), 500);
    },
  });

  return <Component {...args} key={undefined} />;
}
