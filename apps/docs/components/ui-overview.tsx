export function UiOverview() {
  return (
    <div className="not-prose flex flex-row text-sm text-center text-fd-muted-foreground h-[400px] border rounded-md shadow-lg">
      <div className="relative flex flex-col gap-2 w-1/4 p-2">
        <p className="text-xs">Sidebar</p>
        <div className="border p-2 bg-fd-muted">Title</div>
        <div className="border p-2 bg-fd-muted">Sidebar Tabs</div>
        <div className="border p-2 bg-fd-muted">Search</div>
        <div className="flex items-center justify-center border p-2 flex-1 bg-fd-muted">
          Page Tree
        </div>
        <div className="border p-2 mt-auto bg-fd-muted">Footer</div>
      </div>
      <div className="flex flex-col gap-2 flex-1 p-2">
        <p className="text-xs">Docs Page</p>
        <div className="bg-fd-muted border p-2">Article Title</div>
        <div className="bg-fd-muted border p-2">Description</div>
        <div className="bg-fd-muted border flex items-center justify-center flex-1 py-2">
          Body
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="border p-2 bg-fd-muted">Edit on GitHub</div>
          <div className="border p-2 bg-fd-muted">Last Updated</div>
        </div>
        <div className="border p-2">
          <p className="text-xs mb-2">Footer</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="border p-2 bg-fd-muted">Previous</div>
            <div className="border p-2 bg-fd-muted">Next</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-1/4 p-2">
        <p className="text-xs">TOC</p>
        <div className="border p-2 bg-fd-muted">Banner</div>
        <div className="flex items-center justify-center border p-2 flex-1 bg-fd-muted">
          Items
        </div>
        <div className="border p-2 bg-fd-muted">Footer</div>
      </div>
    </div>
  );
}
