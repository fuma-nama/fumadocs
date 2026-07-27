import { cn } from 'cnfast';
import type { NotionBlockOfType } from '../blocks';
import { NotionRichText } from '../rich-text';

const cell = 'min-w-32 border border-fd-border px-3 py-2 text-start align-top';

export function NotionTable({ block }: { block: NotionBlockOfType<'table'> }) {
  const rows = block.children?.filter(
    (child): child is NotionBlockOfType<'table_row'> => child.type === 'table_row',
  );
  if (!rows || rows.length === 0) return null;

  const header = block.table.has_column_header ? rows[0] : undefined;
  const body = header ? rows.slice(1) : rows;

  return (
    <div className="my-5 max-w-full overflow-x-auto" data-notion-table-scroll="">
      <table className="w-full border-collapse text-sm" data-notion-block="table">
        {header ? (
          <thead>
            <tr>
              {header.table_row.cells.map((cells, index) => (
                <th key={index} className={cn(cell, 'bg-fd-muted font-semibold')} scope="col">
                  <NotionRichText value={cells} />
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {body.map((row) => (
            <tr key={row.id}>
              {row.table_row.cells.map((cells, index) =>
                block.table.has_row_header && index === 0 ? (
                  <th key={index} className={cn(cell, 'font-semibold')} scope="row">
                    <NotionRichText value={cells} />
                  </th>
                ) : (
                  <td key={index} className={cell}>
                    <NotionRichText value={cells} />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
