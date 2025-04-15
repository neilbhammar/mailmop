"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  RowSelectionState,
  SortingState,
  getSortedRowModel
} from "@tanstack/react-table"
import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { MinusSquare, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sender, mockSenders } from "./mockData"
import { RowActions } from "./RowActions"

const COLUMN_WIDTHS = {
  checkbox: "w-[3%]",
  name: "w-[20%]",
  email: "w-[30%]",
  lastEmail: "w-[13%]",
  count: "w-[10%]",
  actions: "w-[24%]"
} as const

const columns: ColumnDef<Sender>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="h-4 w-4 flex items-center">
        {table.getIsSomeRowsSelected() && (
          <button
            onClick={() => table.toggleAllRowsSelected(false)}
            className="text-slate-400 hover:text-slate-500 -ml-0.5 -mt-0.5"
          >
            <MinusSquare 
              className="h-5 w-5" 
              strokeWidth={1.5} 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </button>
        )}
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="group-hover:border-slate-600"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting()}
        className="w-full text-left group"
      >
        <span className="text-slate-600 font-normal group-hover:text-slate-900">
          Name
        </span>
      </button>
    ),
    cell: ({ row }) => (
      <div className="truncate">
        <span>{row.getValue("name")}</span>
      </div>
    )
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting()}
        className="w-full text-left group"
      >
        <span className="text-slate-600 font-normal group-hover:text-slate-900">
          Email
        </span>
      </button>
    ),
    cell: ({ row }) => (
      <div className="truncate">
        <span className="text-slate-800 opacity-80">{row.getValue("email")}</span>
      </div>
    )
  },
  {
    accessorKey: "lastEmail",
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting()}
        className="w-full text-left group"
      >
        <span className="text-slate-600 font-normal group-hover:text-slate-900">
          Last Email
        </span>
      </button>
    ),
    cell: ({ row }) => (
      <div className="truncate">
        <span className="text-slate-600">{row.getValue("lastEmail")}</span>
      </div>
    )
  },
  {
    accessorKey: "count",
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting()}
        className="w-full text-right group"
      >
        <span className="inline-flex items-center gap-1 text-slate-600 font-normal group-hover:text-slate-900">
          Count
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
        </span>
      </button>
    ),
    cell: ({ row }) => (
      <div className="truncate text-right pr-2">
        <span className="text-blue-700">{row.getValue("count")}</span>
      </div>
    )
  },
  {
    id: "actions",
    header: () => <div className="text-right"></div>,
    cell: ({ row }) => (
      <RowActions
        sender={row.original}
        onUnsubscribe={(email) => console.log('Unsubscribe:', email)}
        onViewInGmail={(email) => console.log('View in Gmail:', email)}
        onDelete={(email) => console.log('Delete:', email)}
        onMarkUnread={(email) => console.log('Mark Unread:', email)}
        onDeleteWithExceptions={(email) => console.log('Delete with Exceptions:', email)}
        onApplyLabel={(email) => console.log('Apply Label:', email)}
        onBlock={(email) => console.log('Block:', email)}
      />
    )
  }
]


export function SenderTable() {
  const [data] = useState(() => mockSenders)
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [activeRowId, setActiveRowId] = useState<string | null>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      rowSelection,
      sorting,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting
  })

  return (
    <div className="w-full h-full overflow-auto border-t border-slate-100 border-b">
      <table className="w-full text-sm">
        <thead className="border-b sticky top-0 bg-white z-10 shadow-sm">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="h-11">
              {headerGroup.headers.map(header => {
                const width = COLUMN_WIDTHS[header.column.id as keyof typeof COLUMN_WIDTHS]
                return (
                  <th 
                    key={header.id} 
                    className={cn("text-left px-4 py-4 font-semibold bg-white", width)}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr 
              key={row.id} 
              className={cn(
                "h-14 transition-colors cursor-pointer group border-b border-slate-100 last:border-none",
                (row.getIsSelected() || activeRowId === row.id) ? "bg-blue-50/75" : "hover:bg-blue-50/75"
              )}
              onClick={(e) => {
                // Only toggle selection if not clicking on actions
                if (!(e.target as HTMLElement).closest('.actions-container')) {
                  row.toggleSelected(!row.getIsSelected())
                }
              }}
              onMouseEnter={() => setActiveRowId(row.id)}
              onMouseLeave={(e) => {
                // Only clear active row if not hovering over a dropdown
                if (!document.querySelector('[data-state="open"]')) {
                  setActiveRowId(null)
                }
              }}
            >
              {row.getVisibleCells().map(cell => {
                const width = COLUMN_WIDTHS[cell.column.id as keyof typeof COLUMN_WIDTHS]
                return (
                  <td 
                    key={cell.id} 
                    className={cn(
                      "px-4",
                      width,
                      cell.column.id === 'actions' && 'actions-container'
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}