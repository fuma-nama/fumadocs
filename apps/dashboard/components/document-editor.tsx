'use client';

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Collaboration from '@tiptap/extension-collaboration';
import DragHandle from '@tiptap/extension-drag-handle-react';
import Image from '@tiptap/extension-image';
import { NodeRange } from '@tiptap/extension-node-range';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import type { Editor, JSONContent } from '@tiptap/react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import type { LucideIcon } from 'lucide-react';
import { Bold, Code2, GripVertical, Italic, Link2, Strikethrough, Underline } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Doc as YDoc } from 'yjs';

import {
  createEditorBlockCommands,
  isBlockCommandActive,
  type EditorBlockCommand,
} from '@/components/editor-block-commands';
import { cn } from '@/lib/cn';

/** Stable ref for DragHandle `useEffect` deps (avoid re-registering the plugin each render). */
const DOCUMENT_EDITOR_DRAG_HANDLE_FLOAT = {
  placement: 'left-start' as const,
  strategy: 'absolute' as const,
};

function EditorDragHandle({ editor }: { editor: Editor }) {
  return (
    <DragHandle
      editor={editor}
      className="fe-document-drag-handle"
      computePositionConfig={DOCUMENT_EDITOR_DRAG_HANDLE_FLOAT}
      nested
    >
      <button
        type="button"
        className="fe-document-drag-handle__grip"
        aria-label="Drag to reorder block"
        tabIndex={-1}
      >
        <GripVertical className="size-4 shrink-0" aria-hidden />
      </button>
    </DragHandle>
  );
}

function bubbleMenuShouldShow({ editor: ed }: { editor: Editor }) {
  if (!ed.isEditable) return false;
  if (ed.state.selection.empty) return false;
  if (ed.isActive('codeBlock')) return false;
  return true;
}

type MarkUiState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  link: boolean;
};

function useSetLink(editor: Editor) {
  return useCallback(() => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const href = window.prompt('Link URL', prev ?? 'https://');
    if (href === null) return;
    const t = href.trim();
    if (t === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: t }).run();
  }, [editor]);
}

function EditorMarkIconButtons({
  editor,
  marks,
  tone,
  setLink,
  showDividerBeforeLink = true,
}: {
  editor: Editor;
  marks: MarkUiState;
  tone: 'toolbar' | 'bubble';
  setLink: () => void;
  showDividerBeforeLink?: boolean;
}) {
  return (
    <>
      <EditorIconButton
        tone={tone}
        pressed={marks.bold}
        label="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-3.5" strokeWidth={2.25} aria-hidden />
      </EditorIconButton>
      <EditorIconButton
        tone={tone}
        pressed={marks.italic}
        label="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-3.5" strokeWidth={2.25} aria-hidden />
      </EditorIconButton>
      <EditorIconButton
        tone={tone}
        pressed={marks.underline}
        label="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="size-3.5" strokeWidth={2.25} aria-hidden />
      </EditorIconButton>
      <EditorIconButton
        tone={tone}
        pressed={marks.strike}
        label="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-3.5" strokeWidth={2.25} aria-hidden />
      </EditorIconButton>
      <EditorIconButton
        tone={tone}
        pressed={marks.code}
        label="Inline code"
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code2 className="size-3.5" strokeWidth={2.25} aria-hidden />
      </EditorIconButton>
      {showDividerBeforeLink ? (
        <span className="mx-0.5 hidden h-5 w-px shrink-0 bg-fe-border sm:block" aria-hidden />
      ) : null}
      <EditorIconButton tone={tone} pressed={marks.link} label="Link" onClick={setLink}>
        <Link2 className="size-3.5" strokeWidth={2.25} aria-hidden />
      </EditorIconButton>
    </>
  );
}

function EditorBubbleToolbar({ editor }: { editor: Editor }) {
  const marks = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      underline: ed.isActive('underline'),
      strike: ed.isActive('strike'),
      code: ed.isActive('code'),
      link: ed.isActive('link'),
    }),
  });

  const setLink = useSetLink(editor);

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={bubbleMenuShouldShow}
      className="flex flex-wrap items-center gap-0.5 rounded-lg border border-fe-border bg-fe-popover px-1 py-1 text-fe-popover-foreground shadow-md"
      options={{
        placement: 'top',
        offset: 10,
        flip: true,
        onHide: () => undefined,
      }}
    >
      <EditorMarkIconButtons editor={editor} marks={marks} tone="bubble" setLink={setLink} />
    </BubbleMenu>
  );
}

function EditorIconButton({
  tone,
  pressed,
  onClick,
  label,
  children,
}: {
  tone: 'toolbar' | 'bubble';
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-fe-muted-foreground transition-[color,background,box-shadow,transform,border-color] duration-150 ease-out',
        'hover:border-fe-border/60 hover:bg-fe-muted/80 hover:text-fe-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fe-ring/40 focus-visible:ring-offset-2',
        tone === 'bubble' && 'focus-visible:ring-offset-fe-popover',
        tone === 'toolbar' && 'focus-visible:ring-offset-fe-card',
        'motion-reduce:transition-none motion-reduce:active:scale-100',
        'active:scale-[0.96]',
        pressed &&
          'border-fe-border/50 bg-fe-muted text-fe-foreground shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--color-fe-foreground)_8%,transparent)]',
      )}
    >
      {children}
    </button>
  );
}

function EditorBlockToolbar({
  editor,
  blockCommands,
  editable,
}: {
  editor: Editor;
  blockCommands: EditorBlockCommand[];
  editable: boolean;
}) {
  const ui = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      const blocks: Record<string, boolean> = {};
      for (const c of blockCommands) {
        blocks[c.id] = isBlockCommandActive(ed, c.id);
      }
      return {
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        underline: ed.isActive('underline'),
        strike: ed.isActive('strike'),
        code: ed.isActive('code'),
        link: ed.isActive('link'),
        blocks,
      };
    },
  });

  const setLink = useSetLink(editor);

  if (!editable) return null;

  const marks: MarkUiState = {
    bold: ui.bold,
    italic: ui.italic,
    underline: ui.underline,
    strike: ui.strike,
    code: ui.code,
    link: ui.link,
  };

  return (
    <div
      role="toolbar"
      className="flex flex-wrap items-center gap-y-1.5 border-b border-fe-border bg-fe-secondary/40 px-3 py-1"
    >
      <div className="mr-1 flex flex-wrap items-center gap-0.5 border-r border-fe-border pr-2">
        <EditorMarkIconButtons
          editor={editor}
          marks={marks}
          tone="toolbar"
          setLink={setLink}
          showDividerBeforeLink={false}
        />
      </div>

      <div className="flex flex-wrap items-center gap-0.5 pl-1">
        {blockCommands.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <EditorIconButton
              key={cmd.id}
              tone="toolbar"
              pressed={ui.blocks[cmd.id] ?? false}
              label={cmd.title}
              onClick={() => cmd.run(editor)}
            >
              <Icon className="size-3.5" aria-hidden />
            </EditorIconButton>
          );
        })}
      </div>
    </div>
  );
}

const lowlight = createLowlight(common);

export type DocumentEditorUploadHandler = (file: File) => Promise<string>;

export async function mockDocumentEditorUpload(file: File): Promise<string> {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 350));
  return URL.createObjectURL(file);
}

export interface DocumentEditorProps {
  className?: string;
  content?: JSONContent | string;
  editable?: boolean;
  /** When set, document syncs through this Y.Doc (e.g. Hocuspocus). Disables local undo history. */
  collaborationDocument?: YDoc;
  /** Called after each document update (not on every transaction). */
  onUpdate?: (payload: { editor: Editor; json: JSONContent }) => void;
  /** Replace with your API upload; defaults to a delayed object URL. */
  uploadFile?: DocumentEditorUploadHandler;
  autoFocus?: boolean;
}

type SlashRect = { left: number; top: number; width: number; height: number };

type SlashState = { from: number; to: number; query: string; rect: SlashRect };

function readSlashState(editor: Editor): SlashState | null {
  const { state } = editor;
  const { $from } = state.selection;
  const parent = $from.parent;
  if (!parent.type.isTextblock || parent.type.name === 'codeBlock') {
    return null;
  }
  const start = $from.start();
  const end = $from.pos;
  const text = state.doc.textBetween(start, end, '\0', '\0');
  const m = text.match(/^(\s*)\/(.*)$/);
  if (!m) return null;
  const indent = m[1] ?? '';
  const slashPos = start + indent.length;
  const query = m[2] ?? '';
  const coords = editor.view.coordsAtPos(end);
  return {
    from: slashPos,
    to: end,
    query,
    rect: {
      left: coords.left,
      top: coords.bottom + window.scrollY,
      width: 0,
      height: coords.bottom - coords.top,
    },
  };
}

type SlashItem = {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  icon: LucideIcon;
  run: (editor: Editor, range: { from: number; to: number }) => void;
};

function blockCommandToSlashItem(cmd: EditorBlockCommand): SlashItem {
  return {
    id: cmd.id,
    title: cmd.title,
    subtitle: cmd.subtitle,
    keywords: cmd.keywords,
    icon: cmd.icon,
    run: (ed, range) => cmd.runFromSlash(ed, range),
  };
}

function useSlashMenuPosition(rect: SlashRect) {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return { left: rect.left, top: rect.top + 8 };
    }
    const panelW = 280;
    const margin = 12;
    const left = Math.min(Math.max(margin, rect.left), window.innerWidth - panelW - margin);
    const top = rect.top + 8;
    return { left, top };
  }, [rect.left, rect.top]);
}

function SlashMenuPanel({
  editor,
  state,
  items,
  selectedIndex,
  onPick,
  onClose,
}: {
  editor: Editor;
  state: SlashState;
  items: SlashItem[];
  selectedIndex: number;
  onPick: (item: SlashItem) => void;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const pos = useSlashMenuPosition(state.rect);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      editor.chain().focus().run();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [editor]);

  const panelClass =
    'fe-slash-menu pointer-events-auto w-[17.5rem] max-w-[min(17.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-fe-border bg-fe-popover text-fe-popover-foreground shadow-lg';

  const empty = (
    <div
      className={cn(panelClass, 'py-6')}
      style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 200 }}
      role="dialog"
      aria-label="Insert block"
    >
      <p className="px-4 text-center text-[0.8125rem] text-fe-muted-foreground">
        No matching blocks
      </p>
    </div>
  );

  const menu = (
    <div
      className={panelClass}
      style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 200 }}
      role="presentation"
    >
      <div className="flex items-center justify-between border-b border-fe-border/60 px-3 py-2">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-fe-muted-foreground">
          Insert
        </span>
        <span className="text-[0.65rem] tabular-nums text-fe-muted-foreground/80">
          <kbd className="rounded border border-fe-border/80 bg-fe-muted/50 px-1 py-px font-mono text-[0.6rem]">
            ↑↓
          </kbd>
          <span className="mx-1 opacity-50">·</span>
          <kbd className="rounded border border-fe-border/80 bg-fe-muted/50 px-1 py-px font-mono text-[0.6rem]">
            ↵
          </kbd>
        </span>
      </div>
      <div
        ref={listRef}
        className="max-h-[min(19rem,52vh)] overflow-y-auto overscroll-contain px-1.5 py-1.5"
        role="listbox"
        aria-label="Insert block"
        aria-activedescendant={`slash-item-${items[selectedIndex]?.id}`}
      >
        {items.map((item, i) => {
          const Icon = item.icon;
          const active = i === selectedIndex;
          return (
            <button
              key={item.id}
              type="button"
              id={`slash-item-${item.id}`}
              data-index={i}
              role="option"
              aria-selected={active}
              className={cn(
                'fe-slash-row flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-[background,box-shadow,color] duration-150 ease-out',
                active
                  ? 'bg-fe-accent/90 text-fe-accent-foreground shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--color-fe-foreground)_10%,transparent)]'
                  : 'text-fe-card-foreground hover:bg-fe-muted/70',
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(item)}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-[border-color,background] duration-150 motion-reduce:transition-none',
                  active
                    ? 'border-fe-border/40 bg-fe-card/35'
                    : 'border-fe-border/55 bg-fe-secondary/80',
                )}
              >
                <Icon
                  className={cn(
                    'size-4',
                    active ? 'text-fe-accent-foreground/90' : 'text-fe-muted-foreground',
                  )}
                  aria-hidden
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-medium leading-tight">
                  {item.title}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-[0.7rem] leading-snug',
                    active ? 'text-fe-accent-foreground/75' : 'text-fe-muted-foreground',
                  )}
                >
                  {item.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!editor) return null;

  return createPortal(items.length === 0 ? empty : menu, document.body);
}

function filterSlashItems(items: SlashItem[], query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const hay = `${item.title} ${item.subtitle} ${item.keywords.join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}

const emptyDoc: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

export function DocumentEditor({
  className,
  content,
  editable = true,
  collaborationDocument,
  onUpdate,
  uploadFile = mockDocumentEditorUpload,
  autoFocus = false,
}: DocumentEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const slashIndexRef = useRef(0);
  const onUpdateRef = useRef(onUpdate);
  const uploadFileRef = useRef(uploadFile);
  const prevSlashRef = useRef<SlashState | null>(null);
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);

  onUpdateRef.current = onUpdate;
  uploadFileRef.current = uploadFile;
  slashIndexRef.current = slashIndex;

  const extensions = useMemo(() => {
    const kit = StarterKit.configure({
      codeBlock: false,
      ...(collaborationDocument ? { undoRedo: false as const } : {}),
      dropcursor: { color: 'var(--color-fe-ring)', width: 2 },
    });
    const collab = collaborationDocument
      ? Collaboration.configure({ document: collaborationDocument })
      : null;
    const rest = [
      NodeRange,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'typescript',
        HTMLAttributes: { class: 'hljs' },
      }),
      Placeholder.configure({
        placeholder({ node }) {
          if (node.type.name === 'heading') return 'Heading';
          return 'Start writing, or type / for blocks…';
        },
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'fe-doc-img',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'fe-doc-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ];
    return collab ? [kit, collab, ...rest] : [kit, ...rest];
  }, [collaborationDocument]);

  const requestImagePick = useCallback(() => {
    requestAnimationFrame(() => fileRef.current?.click());
  }, []);

  const blockCommands = useMemo(
    () => createEditorBlockCommands(requestImagePick),
    [requestImagePick],
  );

  const slashItems = useMemo(() => blockCommands.map(blockCommandToSlashItem), [blockCommands]);

  const handleImageFiles = useCallback(async (list: FileList | null) => {
    const ed = editorRef.current;
    const file = list?.[0];
    if (!ed || !file || !file.type.startsWith('image/')) return;
    const src = await uploadFileRef.current(file);
    ed.chain().focus().setImage({ src, alt: file.name }).run();
  }, []);

  const initialContent = collaborationDocument
    ? typeof content === 'string'
      ? content
      : ''
    : (content ?? emptyDoc);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: initialContent,
      editable,
      autofocus: autoFocus ? 'end' : false,
      editorProps: {
        attributes: {
          class: 'outline-none',
          spellcheck: 'true',
        },
        handleKeyDown(_view, event) {
          const ed = editorRef.current;
          if (!ed) return false;
          const panel = readSlashState(ed);
          if (!panel) return false;

          if (event.key === 'ArrowDown') {
            const filtered = filterSlashItems(slashItems, panel.query);
            if (filtered.length === 0) return false;
            event.preventDefault();
            const next = Math.min(slashIndexRef.current + 1, filtered.length - 1);
            slashIndexRef.current = next;
            setSlashIndex(next);
            return true;
          }
          if (event.key === 'ArrowUp') {
            const filtered = filterSlashItems(slashItems, panel.query);
            if (filtered.length === 0) return false;
            event.preventDefault();
            const next = Math.max(slashIndexRef.current - 1, 0);
            slashIndexRef.current = next;
            setSlashIndex(next);
            return true;
          }
          if (event.key === 'Enter') {
            const filtered = filterSlashItems(slashItems, panel.query);
            const item = filtered[slashIndexRef.current];
            if (!item) return false;
            event.preventDefault();
            item.run(ed, { from: panel.from, to: panel.to });
            setSlash(null);
            return true;
          }
          return false;
        },
        handleDrop(view, event) {
          const ed = editorRef.current;
          if (!ed || !event.dataTransfer?.files?.length) return false;
          const file = event.dataTransfer.files[0];
          if (!file?.type.startsWith('image/')) return false;
          event.preventDefault();
          void (async () => {
            const src = await uploadFileRef.current(file);
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
            if (pos == null) return;
            ed.chain()
              .focus()
              .insertContentAt(pos, { type: 'image', attrs: { src, alt: file.name } })
              .run();
          })();
          return true;
        },
        handlePaste(_view, event) {
          const ed = editorRef.current;
          const items = event.clipboardData?.items;
          if (!ed || !items) return false;
          for (const item of items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (!file) continue;
              event.preventDefault();
              void (async () => {
                const src = await uploadFileRef.current(file);
                ed.chain().focus().setImage({ src, alt: file.name }).run();
              })();
              return true;
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        onUpdateRef.current?.({ editor: ed, json: ed.getJSON() });
      },
    },
    [extensions],
  );

  editorRef.current = editor;

  const syncSlash = useEffectEvent(() => {
    const s = readSlashState(editor!);
    const prev = prevSlashRef.current;

    if (!s) {
      if (prev === null) return;
      prevSlashRef.current = null;
      setSlash(null);
      return;
    }

    const key = `${s.from}|${s.to}|${s.query}`;
    const prevKey = prev ? `${prev.from}|${prev.to}|${prev.query}` : null;

    if (key === prevKey && prev !== null) {
      const rectMoved =
        Math.abs(prev.rect.left - s.rect.left) > 1 || Math.abs(prev.rect.top - s.rect.top) > 1;
      if (!rectMoved) return;
      prevSlashRef.current = s;
      setSlash(s);
      return;
    }

    prevSlashRef.current = s;
    setSlash(s);
    if (!prev) {
      slashIndexRef.current = 0;
      setSlashIndex(0);
    }
    const filtered = filterSlashItems(slashItems, s.query);
    setSlashIndex((i) => {
      const next = Math.min(i, Math.max(0, filtered.length - 1));
      slashIndexRef.current = next;
      return next;
    });
  });

  useEffect(() => {
    if (!editor) return;

    editor.on('transaction', syncSlash);
    editor.on('selectionUpdate', syncSlash);
    syncSlash();
    return () => {
      editor.off('transaction', syncSlash);
      editor.off('selectionUpdate', syncSlash);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || content === undefined || collaborationDocument) return;
    const cur = JSON.stringify(editor.getJSON());
    const next = typeof content === 'string' ? content : JSON.stringify(content);
    if (cur !== next) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content, collaborationDocument]);

  if (editor && editor.isEditable !== editable) {
    editor.setEditable(editable);
  }

  const filteredSlash = useMemo(
    () => (slash ? filterSlashItems(slashItems, slash.query) : []),
    [slash, slashItems],
  );

  const pickSlash = useCallback(
    (item: SlashItem) => {
      if (!editor || !slash) return;
      item.run(editor, { from: slash.from, to: slash.to });
      setSlash(null);
    },
    [editor, slash],
  );

  const closeSlash = useCallback(() => setSlash(null), []);

  return (
    <div
      className={cn(
        'fe-document-editor group relative flex flex-col overflow-hidden rounded-lg border border-fe-border bg-fe-card text-fe-card-foreground',
        className,
      )}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void handleImageFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {editor ? (
        <EditorBlockToolbar editor={editor} blockCommands={blockCommands} editable={editable} />
      ) : null}

      {editor ? <EditorBubbleToolbar editor={editor} /> : null}

      {editor && slash ? (
        <SlashMenuPanel
          editor={editor}
          state={slash}
          items={filteredSlash}
          selectedIndex={Math.min(slashIndex, Math.max(0, filteredSlash.length - 1))}
          onPick={pickSlash}
          onClose={closeSlash}
        />
      ) : null}

      <div
        className={cn(
          'flex flex-col fe-document-editor__canvas flex-1',
          editable && editor && 'fe-document-editor__canvas--draggable',
        )}
      >
        {editor && editable ? <EditorDragHandle editor={editor} /> : null}
        <EditorContent
          editor={editor}
          className="flex flex-col fe-document-editor__prose flex-1 text-fe-card-foreground"
        />
      </div>
    </div>
  );
}
