'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  className?: string;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No hay datos disponibles',
  className = '',
}: TableProps<T>) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-wood-200 ${className}`}>
      <table className="w-full text-sm text-left">
        <thead className="bg-wood-100 text-wood-700 uppercase text-xs">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-semibold ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-wood-100">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-wood-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="bg-white hover:bg-brand-50 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? '')}
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
