"use client"

import { useEffect } from "react"
import { Crisp } from "crisp-sdk-web"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ExternalLink, Trash2, MailOpen, ChevronDown, PenSquare, Tag, Ban, PenOff, PencilOff } from "lucide-react"
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
  // Add block handler
  const handleBlock = () => {
    onBlockSenders();
  };

  // On mobile the fixed bottom bar occupies the same corner as the Crisp chat
  // launcher — hide the launcher while a selection is active so it never
  // covers the action buttons.
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
    if (!isMobile) return;
    try {
      Crisp.chat.hide();
    } catch {
      // Crisp not configured (e.g., missing env) — nothing to hide
    }
    return () => {
      try {
        Crisp.chat.show();
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <>
    {/* Mobile: fixed bottom action bar (touch-friendly, thumb-reachable).
        Hidden on sm+ where the inline bar below renders instead. */}
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.3)] px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between gap-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 pl-1 shrink-0">{selectedCount} selected</span>
        <div className="flex items-center gap-1">
          <Button
            onClick={onViewInGmail}
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 text-slate-700 dark:text-slate-300"
            aria-label="View in Gmail"
          >
            <ExternalLink className="h-5 w-5" />
          </Button>
          <Button
            onClick={onDelete}
            variant="ghost"
            size="sm"
            disabled={isDeleteDisabled}
            className={cn(
              "h-10 w-10 p-0 text-red-500 dark:text-red-500",
              isDeleteDisabled && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <Button
            onClick={onMarkAllAsRead}
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 text-blue-600/80 dark:text-blue-400/80"
            aria-label="Mark all as read"
          >
            <MailOpen className="h-5 w-5" />
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 text-slate-700 dark:text-slate-300"
              >
                <span className="text-sm">More</span>
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-md dark:shadow-lg dark:shadow-slate-900/50 z-50 py-1">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onDeleteWithExceptions();
                }}
                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70 cursor-pointer"
              >
                <PencilOff className="h-4 w-4 mr-2" />
                <span>Delete with Exceptions</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onApplyLabel();
                }}
                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70 cursor-pointer"
              >
                <Tag className="h-4 w-4 mr-2" />
                <span>Apply Label</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleBlock}
                className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70 cursor-pointer"
              >
                <Ban className="h-4 w-4 mr-2" />
                <span>Block Sender{selectedCount > 1 ? 's' : ''}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>

    {/* Desktop: inline bar in the analysis header (original layout, unchanged) */}
    <div className="hidden sm:flex items-center h-9 gap-1">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedCount} selected</span>
      
      {/* Vertical separator */}
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-3"></div>
      
      {/* View in Gmail */}
      <Button 
        onClick={onViewInGmail}
        variant="ghost"
        size="sm"
        className="text-slate-700 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700 pl-3 pr-4 h-9"
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
          "text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-900/30 pl-3 pr-4 h-9",
          isDeleteDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-red-500 dark:opacity-50 dark:cursor-not-allowed dark:hover:bg-transparent dark:hover:text-red-500"
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
        className="text-blue-600/80 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400/80 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 pl-3 pr-4 h-9"
      >
        <MailOpen className="h-4 w-4 mr-2" />
        <span>Mark All as Read</span>
      </Button>
      
      {/* More dropdown */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-slate-700 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700 pl-3 pr-4 h-9"
          >
            <span>More Actions</span>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-md dark:shadow-lg dark:shadow-slate-900/50 z-50 py-1">
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              onDeleteWithExceptions();
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70 cursor-pointer"
          >
            <PencilOff className="h-4 w-4 mr-2" />
            <span>Delete with Exceptions</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              onApplyLabel();
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70 cursor-pointer"
          >
            <Tag className="h-4 w-4 mr-2" />
            <span>Apply Label</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleBlock}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70 cursor-pointer"
          >
            <Ban className="h-4 w-4 mr-2" />
            <span>Block Sender{selectedCount > 1 ? 's' : ''}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    </>
  )
}