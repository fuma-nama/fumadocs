'use client';

export function CopyPage({ content }: { content: string }) {
  return (
    <button
      className="bg-fd-secondary p-2 inline-flex text-fd-secondary-foreground font-medium text-sm border rounded-lg hover:bg-fd-accent hover:text-fd-accent-foreground"
      onClick={() => {
        void navigator.clipboard.writeText(content);
        console.log('copied content');
      }}
    >
      Copy Page
    </button>
  );
}
