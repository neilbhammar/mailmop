"use client"

/**
 * DeleteMethodPicker.tsx
 *
 * The "Delete method:" control and its consequence callout, shared by
 * DeleteConfirmModal and DeleteWithExceptionsModal.
 *
 * This markup started life inline in DeleteConfirmModal. It lives here now so the
 * two dialogs cannot drift: the same control, the same wording, and the same
 * colour for a given method, whichever dialog the user happens to be in.
 */

import { Trash, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { deleteMethodCopy, type DeleteMethod } from "@/lib/deleteMethod"

interface DeleteMethodSelectProps {
  value: DeleteMethod
  onChange: (method: DeleteMethod) => void
  /** Overrides the "Delete method:" label, e.g. when the dialog says "Trash". */
  label?: string
  id?: string
}

export function DeleteMethodSelect({
  value,
  onChange,
  label = 'Delete method:',
  id = 'delete-method',
}: DeleteMethodSelectProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>

      <Select value={value} onValueChange={(v: DeleteMethod) => onChange(v)}>
        <SelectTrigger
          id={id}
          className="w-full bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-slate-300"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
          <SelectItem value="trash" className="dark:text-slate-300 dark:hover:bg-slate-700">
            <div className="flex items-center gap-2">
              <Trash className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span>{deleteMethodCopy('trash').methodLabel}</span>
            </div>
          </SelectItem>
          <SelectItem value="permanent" className="dark:text-slate-300 dark:hover:bg-slate-700">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>{deleteMethodCopy('permanent').methodLabel}</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

/** The consequence of the chosen method: info-toned for trash, warning-toned for permanent. */
export function DeleteMethodCallout({ method }: { method: DeleteMethod }) {
  const copy = deleteMethodCopy(method)
  const isTrash = copy.tone === 'orange'

  return (
    <div
      className={
        isTrash
          ? "p-3 border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 rounded-md"
          : "p-3 border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 rounded-md"
      }
    >
      <div className="flex items-start gap-2">
        <div
          className={
            isTrash
              ? "w-4 h-4 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center mt-0.5 flex-shrink-0"
              : "w-4 h-4 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mt-0.5 flex-shrink-0"
          }
        >
          <span
            className={
              isTrash
                ? "text-orange-600 dark:text-orange-400 text-xs"
                : "text-red-600 dark:text-red-400 text-xs"
            }
          >
            {copy.calloutBadge}
          </span>
        </div>
        <div>
          <p
            className={
              isTrash
                ? "text-sm text-orange-700 dark:text-orange-300 font-medium"
                : "text-sm text-red-700 dark:text-red-300 font-medium"
            }
          >
            {copy.callout}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Tailwind classes for the dialog's confirm button, tinted to the method. */
export function deleteMethodButtonClass(method: DeleteMethod): string {
  return deleteMethodCopy(method).tone === 'orange'
    ? "bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-700 dark:hover:bg-orange-600 dark:text-orange-100"
    : "bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600 dark:text-red-100"
}
