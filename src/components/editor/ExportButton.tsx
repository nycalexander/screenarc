// Primary button to trigger video export
import { Upload, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

interface ExportButtonProps {
  onClick: () => void
  isExporting: boolean
  disabled?: boolean
}

export function ExportButton({ onClick, isExporting, disabled }: ExportButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isExporting || disabled}
      className={cn(
        'btn-clean bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-8 rounded-lg',
        'transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow',
      )}
    >
      {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
      {isExporting ? 'Exporting...' : 'Export'}
    </Button>
  )
}
