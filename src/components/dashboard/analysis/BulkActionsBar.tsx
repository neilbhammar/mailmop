"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ExternalLink, Trash2, MailOpen, ChevronDown, PenSquare, Tag, Ban } from "lucide-react"
import { useViewInGmail } from "@/hooks/useViewInGmail"
import { cn } from "@/lib/utils"

interface BulkActionsBarProps {
  selectedCount: number
  onViewInGmail: () => void
  onDelete: () => void
  isDeleteDisabled?: boolean
  onMarkAllAsRead: () => void
  onDeleteWithExceptions: () => void
  onApplyLabel: () => void
  onBlockSenders: () => void
}

export function BulkActionsBar({
  selectedCount,
  onViewInGmail,
  onDelete,
  isDeleteDisabled = false,
  onMarkAllAsRead,
  onDeleteWithExceptions,
  onApplyLabel,
  onBlockSenders
}: BulkActionsBarProps) {
  return (
    <div className="flex items-center h-9 gap-1">
      <span className="text-sm font-medium text-slate-700">{selectedCount} selected</span>
      
      {/* Vertical separator */}
      <div className="h-4 w-px bg-slate-200 mx-3"></div>
      
      {/* View in Gmail */}
      <Button 
        onClick={onViewInGmail}
        variant="ghost"
        size="sm"
        className="text-slate-700 hover:text-slate-900 hover:bg-slate-50 pl-3 pr-4 h-9"
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        <span>View in Gmail</span>
      </Button>
      
      {/* Delete */}
      <Button 
        onClick={onDelete}
        variant="ghost"
        size="sm"
        disabled={isDeleteDisabled}
        className={cn(
          "text-red-500 hover:text-red-600 hover:bg-red-50 pl-3 pr-4 h-9",
          isDeleteDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-red-500"
        )}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        <span>Delete</span>
      </Button>
      
      {/* Mark All as Read */}
      <Button 
        onClick={onMarkAllAsRead}
        variant="ghost"
        size="sm"
        className="text-blue-600/80 hover:text-blue-700 hover:bg-blue-50 pl-3 pr-4 h-9"
      >
        <MailOpen className="h-4 w-4 mr-2" />
        <span>Mark All as Read</span>
      </Button>
      
      {/* More dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-slate-700 hover:text-slate-900 hover:bg-slate-50 pl-3 pr-4 h-9"
          >
            <span>More Actions</span>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-white rounded-lg border border-slate-200 shadow-lg">
          <DropdownMenuItem onClick={onDeleteWithExceptions}>
            <PenSquare className="h-4 w-4 mr-2" />
            <span>Delete with Exceptions</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onApplyLabel}>
            <Tag className="h-4 w-4 mr-2" />
            <span>Apply Label</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onBlockSenders}>
            <Ban className="h-4 w-4 mr-2" />
            <span>Block Sender{selectedCount > 1 ? 's' : ''}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 