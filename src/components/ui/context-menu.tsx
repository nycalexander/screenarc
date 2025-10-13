import * as React from 'react'
import { cn } from '../../lib/utils'

interface ContextMenuProps {
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
  children: React.ReactNode
}

export function ContextMenu({ isOpen, onClose, position, children }: ContextMenuProps) {
  // Loại bỏ: if (!isOpen) { return null; }

  React.useEffect(() => {
    // Chỉ thêm listener khi menu được mở để tối ưu hiệu suất
    if (!isOpen) {
      return
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)

    // Cleanup function sẽ chạy khi `isOpen` thay đổi hoặc component unmount
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose]) // Thêm `isOpen` vào dependency array

  return (
    // Sử dụng class `hidden` để ẩn component thay vì trả về `null`
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
        onClick={(e) => e.stopPropagation()} // Ngăn click bên trong menu làm đóng menu
      >
        {children}
      </div>
    </div>
  )
}

// Các component con để xây dựng cấu trúc menu
export const ContextMenuItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <button ref={ref} className={cn('context-menu-item', inset && 'pl-8', className)} {...props} />
))
ContextMenuItem.displayName = 'ContextMenuItem'

export const ContextMenuDivider = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('context-menu-divider', className)} {...props} />,
)
ContextMenuDivider.displayName = 'ContextMenuDivider'
