const win32Sep = '\\';
export default function convertPathToPosix(filePath: string) {
  const isExtendedLengthPath = filePath.startsWith('\\\\?\\');

  if (isExtendedLengthPath) {
    return filePath;
  }

  return filePath.split(win32Sep).join('/');
}
