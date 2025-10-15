import * as React from 'react'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { ChevronDownIcon, RotateCcw } from 'lucide-react'

interface CollapseProps {
  title: string
  description?: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  onReset?: () => void
}

export function Collapse({
  title,
  description,
  icon,
  defaultOpen = true,
  children,
  className = '',
  onReset,
}: CollapseProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  const handleResetClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the collapse from toggling
    onReset?.()
  }

  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={setOpen}
      className={`collapse-root group/collapse ${className}`}
    >
      <div className="flex items-center justify-between w-full">
        <CollapsiblePrimitive.Trigger className="collapse-trigger flex-1 text-left">
          <div className="flex items-center gap-3">
            {icon && <div className="w-5 h-5 flex items-center justify-center text-primary flex-shrink-0">{icon}</div>}
            <div className="flex-1">
              <div className="text-sm font-medium text-sidebar-foreground">{title}</div>
              {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
            </div>
          </div>
          <ChevronDownIcon className="collapse-chevron ml-2" />
        </CollapsiblePrimitive.Trigger>
        {onReset && (
          <button
            onClick={handleResetClick}
            className="opacity-0 group-hover/collapse:opacity-60 hover:!opacity-100 p-1 rounded-md hover:bg-accent transition-opacity duration-200"
            aria-label={`Reset ${title}`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      <CollapsiblePrimitive.Content className="collapse-content">
        <div className="collapse-content-inner">{children}</div>
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  )
}
