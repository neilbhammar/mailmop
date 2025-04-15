"use client"

import { Sender } from "./mockData"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ExternalLink, Trash2, MailOpen, MoreHorizontal, PenSquare, Tag, Ban } from "lucide-react"
import { cn } from "@/lib/utils"

interface RowActionsProps {
  sender: Sender
  onUnsubscribe: (email: string) => void
  onViewInGmail: (email: string) => void
  onDelete: (email: string) => void
  onMarkUnread: (email: string) => void
  onDeleteWithExceptions: (email: string) => void
  onApplyLabel: (email: string) => void
  onBlock: (email: string) => void
  onDropdownOpen: (email: string) => void
}

export function RowActions({
  sender,
  onUnsubscribe,
  onViewInGmail,
  onDelete,
  onMarkUnread,
  onDeleteWithExceptions,
  onApplyLabel,
  onBlock,
  onDropdownOpen
}: RowActionsProps) {
  const isActionTaken = (action: 'unsubscribe' | 'delete' | 'markUnread' | 'block') => {
    return sender.actionsTaken.includes(action)
  }

  // Base styles for icon buttons
  const iconButtonStyles = cn(
    // Default state - low opacity, slate color
    "inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-600 opacity-40",
    // Row hover state - full opacity
    "group-hover:opacity-100",
    // Button hover state - blue background
    "hover:bg-blue-50 hover:text-blue-600",
    // Transition
    "transition-all duration-150"
  )

  // Base styles for the unsubscribe text button
  const unsubscribeStyles = cn(
    // Default state - low opacity, slate color
    "inline-flex items-center justify-center text-sm px-3 py-1.5 rounded-md text-slate-600 opacity-40 font-medium",
    // Row hover state - full opacity, blue text
    "group-hover:opacity-100 group-hover:text-blue-600",
    // Button hover state - blue background
    "hover:bg-blue-50",
    // Transition
    "transition-all duration-150"
  )

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
                  isActionTaken('unsubscribe') && "opacity-40 cursor-not-allowed hover:bg-transparent group-hover:text-slate-400"
                )}
                onClick={() => !isActionTaken('unsubscribe') && onUnsubscribe(sender.email)}
              >
                Unsubscribe
              </div>
            </TooltipTrigger>
            {isActionTaken('unsubscribe') && (
              <TooltipContent>
                <p>Already unsubscribed from this sender</p>
              </TooltipContent>
            )}
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
          <TooltipContent>
            <p>View in Gmail</p>
          </TooltipContent>
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
                "hover:bg-red-50 hover:text-red-600 group-hover:text-red-600",
                isActionTaken('delete') && "opacity-40 cursor-not-allowed hover:bg-transparent group-hover:text-slate-400"
              )}
              onClick={() => !isActionTaken('delete') && onDelete(sender.email)}
            >
              <Trash2 className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isActionTaken('delete') ? 'Already deleted emails from this sender' : 'Delete all emails from sender'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Mark as Read */}
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              className={cn(
                iconButtonStyles,
                isActionTaken('markUnread') && "opacity-40 cursor-not-allowed hover:bg-transparent group-hover:text-slate-400"
              )}
              onClick={() => !isActionTaken('markUnread') && onMarkUnread(sender.email)}
            >
              <MailOpen className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isActionTaken('markUnread') ? 'Already marked as read' : 'Mark all as read'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* More Actions Dropdown */}
      <DropdownMenu 
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
            <TooltipContent>
              <p>More Actions</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-white rounded-lg border border-slate-200 shadow-lg"
        >
          <DropdownMenuItem onClick={() => onDeleteWithExceptions(sender.email)}>
            <PenSquare className="h-4 w-4 mr-2" />
            <span>Delete with Exceptions</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onApplyLabel(sender.email)}>
            <Tag className="h-4 w-4 mr-2" />
            <span>Apply Label</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => !isActionTaken('block') && onBlock(sender.email)}
            disabled={isActionTaken('block')}
            className={cn(isActionTaken('block') && "opacity-40 cursor-not-allowed")}
          >
            <Ban className="h-4 w-4 mr-2" />
            <span>{isActionTaken('block') ? 'Sender blocked' : 'Block Sender'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 