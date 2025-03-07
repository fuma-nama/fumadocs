import type { CodeSample } from '@/render/operation';
import * as CURL from '@/requests/curl';
import * as JS from '@/requests/javascript';
import * as Go from '@/requests/go';
import * as Python from '@/requests/python';

export const defaultSamples: CodeSample[] = [
  {
    label: 'cURL',
    source: CURL.getSampleRequest,
    lang: 'bash',
  },
  {
    label: 'JavaScript',
    source: JS.getSampleRequest,
    lang: 'js',
  },
  {
    label: 'Go',
    source: Go.getSampleRequest,
    lang: 'go',
  },
  {
    label: 'Python',
    source: Python.getSampleRequest,
    lang: 'python',
  },
];
