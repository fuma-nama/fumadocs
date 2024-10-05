'use client';
import * as fs from 'node:fs';
import { createContext } from 'react';
import { useExample } from '../hooks/use-example';
import { Button } from './button';
import { Hello } from './nested/hello';

const Context = createContext('test');

export function Popover(): string {
  console.log('This component uses button.');
  const res = useExample();
  console.log(res);
  Hello();

  return Button();
}

export function externalImports(): void {
  fs.writeFileSync('path', 'content');
  console.log(Context);
}
