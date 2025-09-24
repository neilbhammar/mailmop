'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCrisp } from './CrispProvider'

/**
 * Optional chat button component to manually open Crisp chat
 * You can use this if you want to provide an explicit "Contact Support" button
 * The floating chat bubble will still appear automatically
 */
export function CrispChatButton({ 
  variant = 'outline',
  size = 'sm',
  className = ''
}: {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}) {
  const { openChat } = useCrisp()

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={openChat}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Contact Support
    </Button>
  )
}

