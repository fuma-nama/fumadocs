import type { PortableTextTypeComponent } from '@portabletext/react';
import { File, Files, Folder } from 'fumadocs-ui/components/files';

export interface FileValue {
  _key?: string;
  _type: 'file';
  name?: string;
}

export interface FolderValue {
  _key?: string;
  _type: 'folder';
  name?: string;
  defaultOpen?: boolean;
  items?: FileTreeItem[];
}

export interface FilesValue {
  _type: 'files';
  items?: FileTreeItem[];
}

type FileTreeItem = FileValue | FolderValue;

function renderFileTree(items: FileTreeItem[] | undefined) {
  return items?.map((item, index) => {
    const key = item._key ?? index;

    if (item._type === 'folder') {
      return (
        <Folder key={key} name={item.name ?? ''} defaultOpen={item.defaultOpen}>
          {renderFileTree(item.items)}
        </Folder>
      );
    }

    return <File key={key} name={item.name ?? ''} />;
  });
}

export const filesComponents: {
  file: PortableTextTypeComponent<FileValue>;
  folder: PortableTextTypeComponent<FolderValue>;
  files: PortableTextTypeComponent<FilesValue>;
} = {
  file({ value }) {
    return <File name={value.name ?? ''} />;
  },
  folder({ value }) {
    return (
      <Folder name={value.name ?? ''} defaultOpen={value.defaultOpen}>
        {renderFileTree(value.items)}
      </Folder>
    );
  },
  files({ value }) {
    return <Files>{renderFileTree(value.items)}</Files>;
  },
};
