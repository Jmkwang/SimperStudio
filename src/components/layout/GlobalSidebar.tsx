import { MessageSquare, Workflow, Users, Settings, Moon, Sun, Wand2, Bug } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "../theme/ThemeProvider"
import { useTranslation } from "@/hooks/useTranslation"
import { useAppStore } from '@/stores'

export function GlobalSidebar({ currentView, setCurrentView }: { currentView: string, setCurrentView: (v: string) => void }) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const debugMode = useAppStore(state => state.debugMode)
  const toggleDebugMode = useAppStore(state => state.toggleDebugMode)

  return (
    <TooltipProvider delayDuration={3000}>
      <div className="flex w-[60px] flex-col items-center justify-between py-5 m-1.5 mr-0 rounded-2xl bg-surface border border-border shadow-inner-glow">
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-lunar-300/15 to-lunar-500/5 border border-lunar-300/8 glow-sm">
            <span className="font-semibold text-sm tracking-wider text-lunar-200">S</span>
          </div>

          <nav className="flex flex-col gap-1.5">
            <NavIcon icon={MessageSquare} label={t("Chats")} active={currentView === 'chat'} onClick={() => setCurrentView('chat')} />
            <NavIcon icon={Workflow} label={t("Workflows")} active={currentView === 'workflow'} onClick={() => setCurrentView('workflow')} />
            <NavIcon icon={Users} label={t("Agents")} active={currentView === 'agents'} onClick={() => setCurrentView('agents')} />
            <NavIcon icon={Wand2} label={t("Prompts")} active={currentView === 'prompts'} onClick={() => setCurrentView('prompts')} />
          </nav>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent hover:border-foreground/[0.06] hover:bg-hover transition-all duration-400 ease-out text-muted-foreground hover:text-foreground"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" strokeWidth={1.5} />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" strokeWidth={1.5} />
                <span className="sr-only">Toggle theme</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t("Toggle Theme")}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleDebugMode()}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-400 ease-out",
                  debugMode
                    ? "bg-primary/10 text-primary border border-primary/12"
                    : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-hover hover:border-foreground/[0.06]"
                )}
              >
                {debugMode && (
                  <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
                )}
                <Bug className="h-4 w-4" strokeWidth={1.5} />
                <span className="sr-only">{debugMode ? t("关闭 Debug") : t("开启 Debug")}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{debugMode ? t("Debug 已开启") : t("Debug 已关闭")}</p>
            </TooltipContent>
          </Tooltip>

          <NavIcon icon={Settings} label={t("Settings")} active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
        </div>
      </div>
    </TooltipProvider>
  )
}

function NavIcon({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
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
