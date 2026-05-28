import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function EditNameDialog({
  open,
  onOpenChange,
  title: dialogTitle,
  value,
  onConfirm,
  t,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  value: string
  onConfirm: (newValue: string) => void
  t: (key: string) => string
}) {
  const [name, setName] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(value)
      // Select all text on open
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [open, value])

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== value) {
      onConfirm(trimmed)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm()
            if (e.key === "Escape") onOpenChange(false)
          }}
          className="mt-2"
        />
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            {t('取消')}
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim() || name.trim() === value} className="rounded-xl">
            {t('确定')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
