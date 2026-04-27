import { ensureMdxPath } from '@/lib/storage/paths';

const documentNamePattern = /^project:([^:]+):file:([^:]+)$/;

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function encodeDocumentName(projectId: string, path: string) {
  return `project:${projectId}:file:${encodeBase64Url(ensureMdxPath(path))}`;
}

export function parseDocumentName(documentName: string) {
  const match = documentNamePattern.exec(documentName);
  if (!match) {
    throw new Error('Invalid document name');
  }

  return {
    projectId: match[1],
    path: decodeBase64Url(match[2]),
  };
}
