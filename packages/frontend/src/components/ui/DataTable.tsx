import * as React from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  RowSelectionState,
  getPaginationRowModel,
  Header,
  HeaderGroup,
  Row,
  Cell,
  OnChangeFn,
} from "@tanstack/react-table";
import { cn } from "@/utils/cn";

interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
  isCountLoading?: boolean;
  hasNext: boolean;
  hasPrev: boolean;
}

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  selection?: RowSelectionState;
  onSelectionChange?: OnChangeFn<RowSelectionState>;
  pageSize?: number;
  pagination?: DataTablePaginationProps;
}

export function DataTable<TData>({
  data,
  columns,
  sorting,
  onSortingChange,
  selection,
  onSelectionChange,
  pageSize = 10,
  pagination,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection: selection,
    },
    enableRowSelection: Boolean(onSelectionChange),
    onSortingChange,
    onRowSelectionChange: onSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  React.useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  return (
    <div>
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              {table
                .getHeaderGroups()
                .map((headerGroup: HeaderGroup<TData>) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(
                      (header: Header<TData, unknown>) => (
                        <th
                          key={header.id}
                          className="p-4 text-left text-sm font-medium text-gray-500"
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              {...{
                                className: cn(
                                  "flex items-center gap-2",
                                  header.column.getCanSort()
                                    ? "cursor-pointer select-none"
                                    : ""
                                ),
                                onClick:
                                  header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.getCanSort() && (
                                <span className="text-gray-400">
                                  {{
                                    asc: "↑",
                                    desc: "↓",
                                  }[header.column.getIsSorted() as string] ??
                                    "↕"}
                                </span>
                              )}
                            </div>
                          )}
                        </th>
                      )
                    )}
                  </tr>
                ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row: Row<TData>) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t",
                    selection?.[row.id] && "bg-primary-50"
                  )}
                >
                  {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
                    <td key={cell.id} className="p-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pagination controls below the table */}
      {pagination && (
        <div>
          <div className="flex items-center justify-between mt-4">
            <span>
              Page {pagination.page}
              {pagination.isCountLoading
                ? ""
                : pagination.totalPages !== undefined
                ? ` of ${pagination.totalPages}`
                : ""}
            </span>
            <div>
              <button
                className="mr-2 px-3 py-1 rounded border disabled:opacity-50"
                onClick={pagination.onPrev}
                disabled={!pagination.hasPrev}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 rounded border disabled:opacity-50"
                onClick={pagination.onNext}
                disabled={!pagination.hasNext}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*
// Helper function to create a selection column
export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }: { table: Table<TData> }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }: { row: Row<TData> }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
  };
}
*/
