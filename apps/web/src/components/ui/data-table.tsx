'use client';

import {
  flexRender,
  type Table as TanstackTable,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';

type DataTableProps<TData> = {
  table: TanstackTable<TData>;
  onRowClick?: (row: TData) => void;
  className?: string;
};

export function DataTable<TData>({
  table,
  onRowClick,
  className,
}: DataTableProps<TData>) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border', className)}>
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border bg-surface-elevated/50">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted"
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.getAllColumns().length}
                className="px-4 py-12 text-center text-text-muted"
              >
                Keine Daten vorhanden
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn(
                  'border-b border-border transition-colors last:border-b-0',
                  onRowClick
                    ? 'cursor-pointer hover:bg-surface-hover'
                    : 'hover:bg-surface-hover/50',
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-vhv-text">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
