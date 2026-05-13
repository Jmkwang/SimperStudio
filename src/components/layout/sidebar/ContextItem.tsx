import { cn } from "@/lib/utils"
import { Workflow } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

export function ContextItem({
  title,
  icon,
  avatar,
  fallbackName,
  active = false,
  deletable = false,
  onClick,
  onDelete,
  t,
}: {
  title: string,
  icon?: 'workflow' | 'agent',
  avatar?: string,
  fallbackName?: string,
  active?: boolean,
  deletable?: boolean,
  onClick?: () => void,
  onDelete?: () => void,
  t: (key: string) => string,
}) {
  return (
    <div
      className={cn(
        "group relative flex w-full items-center text-sm rounded-xl transition-all duration-400 ease-out",
        active
            ? "bg-primary/8 text-foreground border border-primary/10 glow-sm"
            : "border border-transparent text-foreground hover:bg-hover hover:border-foreground/[0.06]"
      )}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
      )}
      <button
        onClick={onClick}
        className="min-w-0 flex-1 flex items-center gap-2.5 px-3 h-10 text-left active:scale-[0.98] transition-transform duration-200"
      >
        {icon === 'workflow' && (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-foreground/[0.08]">
            <Workflow className="h-3 w-3" strokeWidth={1.5} />
          </div>
        )}
        {icon === 'agent' && (
          <Avatar className="h-5 w-5 shrink-0 rounded-lg border border-foreground/[0.08]">
            <AvatarImage src={avatar} />
            <AvatarFallback className="bg-transparent text-current text-[8px]">
              {fallbackName?.slice(0, 1) || "A"}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="block truncate">{title}</span>
      </button>
      {deletable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(event) => event.stopPropagation()}
              className="mr-1 p-1.5 text-muted-foreground opacity-0 transition-all duration-400 ease-out hover:bg-hover rounded-lg group-hover:opacity-100"
              title={t('更多')}
            >
              <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onClick={(event) => {
              event.stopPropagation();
            }}>
              <Pencil className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              {t('编辑')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              {t('删除')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
