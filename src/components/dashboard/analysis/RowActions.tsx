"use client"

import { Sender } from "./SenderTable"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ExternalLink, Trash2, MailOpen, MoreHorizontal, PenSquare, Tag, Ban, PencilOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Portal } from "@radix-ui/react-portal"

interface RowActionsProps {
  sender: Sender
  onUnsubscribe: (email: string) => void
  onReUnsubscribe?: (email: string) => void  // New callback for already-unsubscribed senders
  onViewInGmail: (email: string) => void
  onDelete: (email: string, count?: number) => void
  onMarkUnread: (email: string, unreadCount?: number) => void
  onDeleteWithExceptions: (email: string, count?: number) => void
  onApplyLabel: (email: string) => void
  onBlock: (email: string) => void
  onDropdownOpen: (email: string) => void
}

export function RowActions({
  sender,
  onUnsubscribe,
  onReUnsubscribe,
  onViewInGmail,
  onDelete,
  onMarkUnread,
  onDeleteWithExceptions,
  onApplyLabel,
  onBlock,
  onDropdownOpen
}: RowActionsProps) {
  const isActionTaken = (action: 'unsubscribe' | 'delete' | 'markUnread' | 'block') => {
    return sender.actionsTaken && sender.actionsTaken.includes(action);
  }

  // Base styles for icon buttons
  const iconButtonStyles = cn(
    // Default state - low opacity, slate color
    "inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-600 dark:text-slate-400 opacity-40 dark:opacity-70",
    // Row hover state - full opacity
    "group-hover:opacity-100",
    // Button hover state - blue background
    "hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400",
    // Transition
    "transition-all duration-150"
  )

  // Base styles for the unsubscribe text button
  const unsubscribeStyles = cn(
    // Default state - low opacity, slate color
    "inline-flex items-center justify-center text-sm px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 opacity-40 dark:opacity-70 font-medium",
    // Row hover state - full opacity, blue text
    "group-hover:opacity-100 group-hover:text-blue-600 dark:group-hover:text-blue-400",
    // Button hover state - blue background
    "hover:bg-blue-50 dark:hover:bg-slate-700",
    // Transition
    "transition-all duration-150"
  )

  // Add block handler
  const handleBlock = () => {
    onBlock(sender.email);
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* Unsubscribe Button - Only show if hasUnsubscribe is true */}
      {sender.hasUnsubscribe && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  unsubscribeStyles,
                  isActionTaken('unsubscribe') && "opacity-40 dark:opacity-30 group-hover:text-slate-400 dark:group-hover:text-slate-500"
                )}
                onClick={() => {
                  if (isActionTaken('unsubscribe')) {
                    onReUnsubscribe?.(sender.email);
                  } else {
                    onUnsubscribe(sender.email);
                  }
                }}
              >
                Unsubscribe
              </div>
            </TooltipTrigger>
            <Portal container={document.getElementById('tooltip-root')}>
              {isActionTaken('unsubscribe') && (
                <TooltipContent sideOffset={5} className="z-[100]">
                  <p>You've already unsubscribed from this sender. Click to try again.</p>
                </TooltipContent>
              )}
              {!isActionTaken('unsubscribe') && (
                <TooltipContent sideOffset={5} className="z-[100]">
                  <p>Unsubscribe from {sender.name || sender.email}</p>
                </TooltipContent>
              )}
            </Portal>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* View in Gmail */}
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              className={iconButtonStyles}
              onClick={() => onViewInGmail(sender.email)}
            >
              <ExternalLink className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <Portal container={document.getElementById('tooltip-root')}>
            <TooltipContent sideOffset={5} className="z-[100]">
              <p>View in Gmail</p>
            </TooltipContent>
          </Portal>
        </Tooltip>
      </TooltipProvider>

      {/* Delete All */}
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              className={cn(
                iconButtonStyles,
                "hover:bg-red-50 hover:text-red-600 group-hover:text-red-600 dark:hover:bg-red-700/20 dark:hover:text-red-400 dark:group-hover:text-red-400",
                isActionTaken('delete') && "opacity-40 dark:opacity-30 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent group-hover:text-slate-400 dark:group-hover:text-slate-500"
              )}
              onClick={() => !isActionTaken('delete') && onDelete(sender.email, sender.count)}
            >
              <Trash2 className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <Portal container={document.getElementById('tooltip-root')}>
            <TooltipContent sideOffset={5} className="z-[100]">
              <p>{isActionTaken('delete') ? 'Already deleted emails from this sender' : 'Delete all emails from sender'}</p>
            </TooltipContent>
          </Portal>
        </Tooltip>
      </TooltipProvider>

      {/* Mark as Read */}
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              className={iconButtonStyles}
              onClick={(e) => {
                e.stopPropagation();
                onMarkUnread(sender.email, sender.unread_count);
              }}
            >
              <MailOpen className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <Portal container={document.getElementById('tooltip-root')}>
            <TooltipContent sideOffset={5} className="z-[100]">
              <p>Mark all as read</p>
            </TooltipContent>
          </Portal>
        </Tooltip>
      </TooltipProvider>

      {/* More Actions Dropdown */}
      <DropdownMenu 
        modal={false}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            onDropdownOpen(sender.email)
          }
        }}
      >
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  className={iconButtonStyles}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </div>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <Portal container={document.getElementById('tooltip-root')}>
              <TooltipContent sideOffset={5} className="z-[100]">
                <p>More Actions</p>
              </TooltipContent>
            </Portal>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-md z-50 py-1"
        >
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              onDeleteWithExceptions(sender.email, sender.count);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70 cursor-pointer"
          >
            <PencilOff className="h-4 w-4 mr-2 shrink-0" />
            <span>Delete with Exceptions</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onSelect={(e) => {
              e.preventDefault();
              onApplyLabel(sender.email);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70 cursor-pointer"
          >
            <Tag className="h-4 w-4 mr-2" />
            <span>Apply Label</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleBlock}
            className={cn(
              "flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-slate-700/70 cursor-pointer",
              isActionTaken('block') && "opacity-40 cursor-not-allowed data-[highlighted]:bg-white dark:data-[highlighted]:bg-slate-800"
            )}
          >
            <Ban className="h-4 w-4 mr-2" />
            <span>{isActionTaken('block') ? 'Sender blocked' : 'Block Sender'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 