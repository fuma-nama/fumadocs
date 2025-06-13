import type { CodeSample } from '@/render/operation';
import * as CURL from '@/requests/curl';
import * as JS from '@/requests/javascript';
import * as Go from '@/requests/go';
import * as Python from '@/requests/python';
import * as Java from '@/requests/java';

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
];
