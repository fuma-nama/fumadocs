export function idToTitle(id: string): string {
  const title = id
    // only the part after the last '.' counts, like 'migrations.dev' -> 'dev'
    .slice(id.lastIndexOf('.') + 1)
    .replaceAll('-', ' ')
    // a word starts at a capital after a lowercase letter or digit, unless the capital ends the id (`getUser`, `userAPI`, but `KSeF`)
    .replace(/([a-z0-9])(?=[A-Z][A-Za-z0-9])/g, '$1 ')
    // and at the last capital of an acronym (`HTTPServer`)
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2');

  return title.charAt(0).toLocaleUpperCase() + title.slice(1);
}
