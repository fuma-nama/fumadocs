export function generatePythonObject(v: unknown, imports = new Set()): string {
  if (v === null) {
    return 'None';
  } else if (typeof v === 'boolean') {
    return v ? 'True' : 'False';
  } else if (typeof v === 'string') {
    return JSON.stringify(v);
  } else if (typeof v === 'number') {
    return v.toString();
  } else if (Array.isArray(v)) {
    const items = v.map((item) => generatePythonObject(item, imports));
    return `[${items.join(', ')}]`;
  } else if (v instanceof Date) {
    imports.add('datetime');
    return `datetime.datetime(${v.getFullYear()}, ${v.getMonth() + 1}, ${v.getDate()}, ${v.getHours()}, ${v.getMinutes()}, ${v.getSeconds()}, ${v.getMilliseconds()})`;
  } else if (typeof v === 'object') {
    const entries = Object.entries(v).map(
      ([key, value]) =>
        `  ${JSON.stringify(key)}: ${generatePythonObject(value, imports)}`,
    );
    return `{\n${entries.join(', \n')}\n}`;
  } else {
    throw new Error(`Unsupported type: ${typeof v}`);
  }
}
