import type { Editor } from '@tiptap/react';
import type { LucideIcon } from 'lucide-react';
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Table2,
} from 'lucide-react';

export type SlashRange = { from: number; to: number };

/**
 * Block insert/transform commands shared by the slash menu and top toolbar.
 * `runFromSlash` removes the `/…` range first; `run` applies at the current cursor.
 */
export interface EditorBlockCommand {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  icon: LucideIcon;
  runFromSlash: (ed: Editor, range: SlashRange) => void;
  run: (ed: Editor) => void;
}

function afterDelete(ed: Editor, range: SlashRange): ReturnType<Editor['chain']> {
  return ed.chain().focus().deleteRange(range);
}

export function createEditorBlockCommands(requestImagePick: () => void): EditorBlockCommand[] {
  return [
    {
      id: 'text',
      title: 'Text',
      subtitle: 'Plain paragraph',
      keywords: ['paragraph', 'p', 'text'],
      icon: Pilcrow,
      runFromSlash: (ed, range) => {
        afterDelete(ed, range).setParagraph().run();
      },
      run: (ed) => ed.chain().focus().setParagraph().run(),
    },
    {
      id: 'h1',
      title: 'Heading 1',
      subtitle: 'Large section title',
      keywords: ['title', 'h1'],
      icon: Heading1,
      runFromSlash: (ed, range) => {
        afterDelete(ed, range).setHeading({ level: 1 }).run();
      },
      run: (ed) => ed.chain().focus().setHeading({ level: 1 }).run(),
    },
    {
      id: 'h2',
      title: 'Heading 2',
      subtitle: 'Medium section title',
      keywords: ['subtitle', 'h2'],
      icon: Heading2,
      runFromSlash: (ed, range) => {
        afterDelete(ed, range).setHeading({ level: 2 }).run();
      },
      run: (ed) => ed.chain().focus().setHeading({ level: 2 }).run(),
    },
    {
      id: 'h3',
      title: 'Heading 3',
      subtitle: 'Small section title',
      keywords: ['h3'],
      icon: Heading3,
      runFromSlash: (ed, range) => {
        afterDelete(ed, range).setHeading({ level: 3 }).run();
      },
      run: (ed) => ed.chain().focus().setHeading({ level: 3 }).run(),
    },
    {
      id: 'bullet',
      title: 'Bulleted list',
      subtitle: 'Unordered list',
      keywords: ['ul', 'bullet'],
      icon: List,
      runFromSlash: (ed, range) => {
        afterDelete(ed, range).toggleBulletList().run();
      },
      run: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered',
      title: 'Numbered list',
      subtitle: 'Ordered list',
      keywords: ['ol', 'number'],
      icon: ListOrdered,
      runFromSlash: (ed, range) => {
        afterDelete(ed, range).toggleOrderedList().run();
      },
      run: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'quote',
      title: 'Quote',
      subtitle: 'Callout block',
      keywords: ['blockquote'],
      icon: Quote,
      runFromSlash: (ed, range) => {
        afterDelete(ed, range).toggleBlockquote().run();
      },
      run: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'code',
      title: 'Code block',
      subtitle: 'Syntax highlighting',
      keywords: ['snippet'],
      icon: Code2,
      runFromSlash: (ed, range) => {
        afterDelete(ed, range).toggleCodeBlock().run();
      },
      run: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'divider',
      title: 'Divider',
      subtitle: 'Horizontal rule',
      keywords: ['hr', 'line', 'separator'],
      icon: Minus,
      runFromSlash: (ed, range) => {
        afterDelete(ed, range).setHorizontalRule().run();
      },
      run: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
    {
      id: 'table',
      title: 'Table',
      subtitle: '3×3 with header',
      keywords: ['grid'],
      icon: Table2,
      runFromSlash: (ed, range) => {
        afterDelete(ed, range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
      run: (ed) => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: 'image',
      title: 'Image',
      subtitle: 'Upload from device (mock)',
      keywords: ['photo', 'picture', 'upload'],
      icon: ImageIcon,
      runFromSlash: (ed, range) => {
        ed.chain().focus().deleteRange(range).run();
        requestImagePick();
      },
      run: (ed) => {
        ed.chain().focus().run();
        requestImagePick();
      },
    },
  ];
}

export function isBlockCommandActive(ed: Editor, id: string): boolean {
  switch (id) {
    case 'text':
      return (
        ed.isActive('paragraph') &&
        !ed.isActive('heading') &&
        !ed.isActive('bulletList') &&
        !ed.isActive('orderedList') &&
        !ed.isActive('blockquote') &&
        !ed.isActive('codeBlock')
      );
    case 'h1':
      return ed.isActive('heading', { level: 1 });
    case 'h2':
      return ed.isActive('heading', { level: 2 });
    case 'h3':
      return ed.isActive('heading', { level: 3 });
    case 'bullet':
      return ed.isActive('bulletList');
    case 'ordered':
      return ed.isActive('orderedList');
    case 'quote':
      return ed.isActive('blockquote');
    case 'code':
      return ed.isActive('codeBlock');
    case 'table':
      return ed.isActive('table');
    default:
      return false;
  }
}
