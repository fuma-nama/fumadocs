export interface Release {
  title: string;
  description: string;
}

/** the button's releases, newest first */
export async function getReleases(): Promise<Release[]> {
  return [
    { title: '2.1.0', description: 'Adds href, to render a link.' },
    { title: '2.0.0', description: 'Deprecates color for className.' },
    { title: '1.0.0', description: 'First release.' },
  ];
}
