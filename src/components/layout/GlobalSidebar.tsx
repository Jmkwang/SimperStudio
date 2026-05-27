import { MessageSquare, GitBranch, Workflow, Users, Settings, Moon, Sun, Wand2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "../theme/ThemeProvider"
import { useTranslation } from "@/hooks/useTranslation"
import { DebugBadge } from "@/components/debug/DebugBadge"

export function GlobalSidebar({ currentView, setCurrentView }: { currentView: string, setCurrentView: (v: string) => void }) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <TooltipProvider delayDuration={400}>
      <div className="relative flex w-[60px] flex-col items-center justify-between py-5 m-1 mr-0 rounded-2xl bg-surface border border-border shadow-inner-glow">
        <DebugBadge id="GlobalSidebar" position="top-left" />
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 glow-sm">
            <span className="font-semibold text-sm tracking-wider text-primary">S</span>
          </div>

          <nav className="flex flex-col gap-2" aria-label={t("Main Navigation")}>
            <NavIcon icon={MessageSquare} label={t("Chats")} active={currentView === 'chat'} onClick={() => setCurrentView('chat')} />
            <NavIcon icon={GitBranch} label={t("Workflow Chat")} active={currentView === 'workflowChat'} onClick={() => setCurrentView('workflowChat')} />
            <NavIcon icon={Workflow} label={t("Workflows")} active={currentView === 'workflow'} onClick={() => setCurrentView('workflow')} />
            <NavIcon icon={Users} label={t("Agents")} active={currentView === 'agents'} onClick={() => setCurrentView('agents')} />
            <NavIcon icon={Wand2} label={t("Prompts")} active={currentView === 'prompts'} onClick={() => setCurrentView('prompts')} />
          </nav>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent hover:border-foreground/[0.06] hover:bg-hover transition-all duration-400 ease-out text-muted-foreground hover:text-foreground"
                aria-label={t("Toggle Theme")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" strokeWidth={1.5} />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t("Toggle Theme")}</p>
            </TooltipContent>
          </Tooltip>

          <NavIcon icon={Settings} label={t("Settings")} active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
        </div>
      </div>
    </TooltipProvider>
  )
}

function NavIcon({ icon: Icon, label, active = false, onClick }: { icon: LucideIcon, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-400 ease-out",
            active
              ? "bg-primary/10 text-primary border border-primary/12 glow-sm"
              : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-hover hover:border-foreground/[0.06]"
          )}
        >
          {active && (
            <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
          )}
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
          <span className="sr-only">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
