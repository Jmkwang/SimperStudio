import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  onConfirm: () => void
  t: (key: string) => string
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  t,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] rounded-xl">
        <DialogHeader className="gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle className="text-base">{t('确认删除')}</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            {description || `${t('确定要删除')}「${title}」？${t('此操作不可撤销。')}`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('取消')}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => { onConfirm(); onOpenChange(false); }}>
            {t('删除')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
