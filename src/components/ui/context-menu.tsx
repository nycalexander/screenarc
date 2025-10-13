import * as React from 'react'
import { cn } from '../../lib/utils'

interface ContextMenuProps {
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
  children: React.ReactNode
}

export function ContextMenu({ isOpen, onClose, position, children }: ContextMenuProps) {
  React.useEffect(() => {
    // Only add listener when menu is open
    if (!isOpen) {
      return
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)

    // Cleanup function will run when `isOpen` changes or component unmount
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose]) // Add `isOpen` to dependency array

  return (
    // Use class `hidden` to hide component instead of returning `null`
    <div
      className={cn('context-menu-backdrop', { hidden: !isOpen })}
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div
        className="context-menu-panel"
        style={{ top: position.y, left: position.x }}
        onClick={(e) => e.stopPropagation()} // Prevent click inside menu from closing it
      >
        {children}
      </div>
    </div>
  )
}

export const ContextMenuItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { inset?: boolean; className?: string }
>(({ className, inset, ...props }, ref) => (
  <button ref={ref} className={cn('context-menu-item', inset && 'pl-8', className)} {...props} />
))
ContextMenuItem.displayName = 'ContextMenuItem'

export const ContextMenuDivider = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('context-menu-divider', className)} {...props} />,
)
ContextMenuDivider.displayName = 'ContextMenuDivider'
