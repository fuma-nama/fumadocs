import type { CodeSample } from '@/ui/operation';
import * as CURL from './curl';
import * as JS from './javascript';
import * as Go from './go';
import * as Python from './python';
import * as Java from './java';
import * as CSharp from './csharp';

export const defaultSamples: CodeSample[] = [
  {
    label: 'cURL',
    source: CURL.generator,
    lang: 'bash',
  },
  {
    label: 'JavaScript',
    source: JS.generator,
    lang: 'js',
  },
  {
    label: 'Go',
    source: Go.generator,
    lang: 'go',
  },
  {
    label: 'Python',
    source: Python.generator,
    lang: 'python',
  },
  {
    label: 'Java',
    source: Java.generator,
    lang: 'java',
  },
  {
    label: 'C#',
    source: CSharp.generator,
    lang: 'csharp',
  },
];
