import convertPathToPosix from './convert-path-to-posix.js';
import { decodeInternalRef } from '../../schema/ref.js';

const forwardSlashPattern = /\//g;
const protocolPattern = /^(\w{2,}):\/\//i;

import { isWindows } from './is-windows.js';

const isAbsoluteWin32Path = /^[a-zA-Z]:[\\/]/;

// RegExp patterns to URL-encode special characters in local filesystem paths
const urlEncodePatterns = [
  [/\?/g, '%3F'],
  [/#/g, '%23'],
] as [RegExp, string][];

// RegExp patterns to URL-decode special characters for local filesystem paths
const urlDecodePatterns = [/%23/g, '#', /%24/g, '$', /%26/g, '&', /%2C/g, ',', /%40/g, '@'];

export const parse = (u: string | URL) => new URL(u);

/**
 * Returns resolved target URL relative to a base URL in a manner similar to that of a Web browser resolving an anchor tag HREF.
 *
 * @returns
 */
export function resolve(from: string, to: string) {
  // we use a non-existent URL to check if its a relative URL
  const fromUrl = new URL(convertPathToPosix(from), 'https://aaa.nonexistanturl.com');
  const resolvedUrl = new URL(convertPathToPosix(to), fromUrl);
  const endSpaces = to.match(/(\s*)$/)?.[1] || '';
  if (resolvedUrl.hostname === 'aaa.nonexistanturl.com') {
    // `from` is a relative URL.
    const { pathname, search, hash } = resolvedUrl;
    return pathname + search + decodeURIComponent(hash) + endSpaces;
  }
  const resolved = resolvedUrl.toString() + endSpaces;
  // if there is a #, we want to split on the first one only, and decode the part after
  if (resolved.includes('#')) {
    const [base, hash] = resolved.split('#', 2);
    return base + '#' + decodeURIComponent(hash || '');
  }
  return resolved;
}

/**
 * Returns the current working directory (in Node) or the current page URL (in browsers).
 *
 * @returns
 */
export function cwd() {
  if (typeof window !== 'undefined' && window.location && window.location.href) {
    const href = window.location.href;
    if (!href || !href.startsWith('http')) {
      // try parsing as url, and if it fails, return root url /
      try {
        new URL(href);
        return href;
      } catch {
        return '/';
      }
    }
    return href;
  }

  if (typeof process !== 'undefined' && process.cwd) {
    const path = process.cwd();

    const lastChar = path.slice(-1);
    if (lastChar === '/' || lastChar === '\\') {
      return path;
    } else {
      return path + '/';
    }
  }
  return '/';
}

/**
 * Returns the protocol of the given URL, or `undefined` if it has no protocol.
 *
 * @param path
 * @returns
 */
export function getProtocol(path: string | undefined) {
  const match = protocolPattern.exec(path || '');
  if (match) {
    return match[1].toLowerCase();
  }
  return undefined;
}

/**
 * Returns the lowercased file extension of the given URL,
 * or an empty string if it has no extension.
 *
 * @param path
 * @returns
 */
export function getExtension(path: string) {
  const lastDot = path.lastIndexOf('.');
  if (lastDot >= 0) {
    return stripQuery(path.substring(lastDot).toLowerCase());
  }
  return '';
}

/**
 * Removes the query, if any, from the given path.
 *
 * @param path
 * @returns
 */
export function stripQuery(path: string) {
  const queryIndex = path.indexOf('?');
  if (queryIndex >= 0) {
    path = path.substring(0, queryIndex);
  }
  return path;
}

/**
 * Returns the hash (URL fragment), of the given path.
 * If there is no hash, then the root hash ("#") is returned.
 *
 * @param path
 * @returns
 */
export function getHash(path: undefined | string) {
  if (!path) {
    return '#';
  }
  const hashIndex = path.indexOf('#');
  if (hashIndex >= 0) {
    return path.substring(hashIndex);
  }
  return '#';
}

/**
 * Removes the hash (URL fragment), if any, from the given path.
 *
 * @param path
 * @returns
 */
export function stripHash(path: string | undefined) {
  if (!path) {
    return '';
  }
  const hashIndex = path.indexOf('#');
  if (hashIndex >= 0) {
    path = path.substring(0, hashIndex);
  }
  return path;
}

/**
 * Determines whether the given path is a filesystem path.
 * This includes "file://" URLs.
 *
 * @param path
 * @returns
 */
export function isFileSystemPath(path: string | undefined) {
  // @ts-ignore
  if (typeof window !== 'undefined' || (typeof process !== 'undefined' && process.browser)) {
    // We're running in a browser, so assume that all paths are URLs.
    // This way, even relative paths will be treated as URLs rather than as filesystem paths
    return false;
  }

  const protocol = getProtocol(path);
  return protocol === undefined || protocol === 'file';
}

/**
 * Converts a filesystem path to a properly-encoded URL.
 *
 * This is intended to handle situations where JSON Schema $Ref Parser is called
 * with a filesystem path that contains characters which are not allowed in URLs.
 *
 * @example
 * The following filesystem paths would be converted to the following URLs:
 *
 *    <"!@#$%^&*+=?'>.json              ==>   %3C%22!@%23$%25%5E&*+=%3F\'%3E.json
 *    C:\\My Documents\\File (1).json   ==>   C:/My%20Documents/File%20(1).json
 *    file://Project #42/file.json      ==>   file://Project%20%2342/file.json
 *
 * @param path
 * @returns
 */
export function fromFileSystemPath(path: string) {
  // Step 1: On Windows, replace backslashes with forward slashes,
  // rather than encoding them as "%5C"
  if (isWindows()) {
    const projectDir = cwd();
    const upperPath = path.toUpperCase();
    const projectDirPosixPath = convertPathToPosix(projectDir);
    const posixUpper = projectDirPosixPath.toUpperCase();
    const hasProjectDir = upperPath.includes(posixUpper);
    const hasProjectUri = upperPath.includes(posixUpper);
    const isAbsolutePath =
      isAbsoluteWin32Path.test(path) ||
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('file://');

    if (!(hasProjectDir || hasProjectUri || isAbsolutePath) && !projectDir.startsWith('http')) {
      const join = (a: string, b: string) => {
        if (a.endsWith('/') || a.endsWith('\\')) {
          return a + b;
        } else {
          return a + '/' + b;
        }
      };
      path = join(projectDir, path);
    }
    path = convertPathToPosix(path);
  }

  // Step 2: `encodeURI` will take care of MOST characters
  path = encodeURI(path);

  // Step 3: Manually encode characters that are not encoded by `encodeURI`.
  // This includes characters such as "#" and "?", which have special meaning in URLs,
  // but are just normal characters in a filesystem path.
  for (const pattern of urlEncodePatterns) {
    path = path.replace(pattern[0], pattern[1]);
  }

  return path;
}

/**
 * Converts a URL to a local filesystem path.
 */
export function toFileSystemPath(path: string | undefined, keepFileProtocol?: boolean): string {
  // Bare "%" characters are valid in filesystem paths, but they make `decodeURI` throw.
  // Escape only the non-encoded ones so percent-encoded sequences still decode normally.
  path = path!.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');

  // Step 1: `decodeURI` will decode characters such as Cyrillic characters, spaces, etc.
  path = decodeURI(path!);

  // Step 2: Manually decode characters that are not decoded by `decodeURI`.
  // This includes characters such as "#" and "?", which have special meaning in URLs,
  // but are just normal characters in a filesystem path.
  for (let i = 0; i < urlDecodePatterns.length; i += 2) {
    path = path.replace(urlDecodePatterns[i], urlDecodePatterns[i + 1] as string);
  }

  // Step 3: If it's a "file://" URL, then format it consistently
  // or convert it to a local filesystem path
  let isFileUrl = path.toLowerCase().startsWith('file://');
  if (isFileUrl) {
    // Strip-off the protocol, and the initial "/", if there is one
    path = path.replace(/^file:\/\//, '').replace(/^\//, '');

    // insert a colon (":") after the drive letter on Windows
    if (isWindows() && path[1] === '/') {
      path = `${path[0]}:${path.substring(1)}`;
    }

    if (keepFileProtocol) {
      // Return the consistently-formatted "file://" URL
      path = 'file:///' + path;
    } else {
      // Convert the "file://" URL to a local filesystem path.
      // On Windows, it will start with something like "C:/".
      // On Posix, it will start with "/"
      isFileUrl = false;
      path = isWindows() ? path : '/' + path;
    }
  }

  // Step 4: Normalize Windows paths (unless it's a "file://" URL)
  if (isWindows() && !isFileUrl) {
    // Replace forward slashes with backslashes
    path = path.replace(forwardSlashPattern, '\\');

    // Capitalize the drive letter
    if (path.match(/^[a-z]:\\/i)) {
      path = path[0].toUpperCase() + path.substring(1);
    }
  }

  return path;
}

/**
 * Converts a $ref pointer to a valid JSON Path.
 *
 * @param pointer
 * @returns
 */
export function safePointerToPath(pointer: string) {
  if (pointer.length <= 1 || pointer[0] !== '#' || pointer[1] !== '/') {
    return [];
  }

  return decodeInternalRef(pointer);
}
