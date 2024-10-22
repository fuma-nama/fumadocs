import { File, Files, Folder } from 'fumadocs-ui/components/files';
import type { ReactNode } from 'react';

export default function Preview(): ReactNode {
  return (
    <Files>
      <Folder name="app" defaultOpen>
        <Folder name="[id]" defaultOpen>
          <File name="page.tsx" />
        </Folder>
        <File name="layout.tsx" />
        <File name="page.tsx" />
        <File name="global.css" />
      </Folder>
      <Folder name="components">
        <File name="button.tsx" />
        <File name="tabs.tsx" />
        <File name="dialog.tsx" />
        <Folder name="empty" />
      </Folder>
      <File name="package.json" />
    </Files>
  );
}
