import { MessageSquare, Workflow, Users, Settings, Moon, Sun, Wand2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "../theme/ThemeProvider"
import { useTranslation } from "@/hooks/useTranslation"

export function GlobalSidebar({ currentView, setCurrentView }: { currentView: string, setCurrentView: (v: string) => void }) {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <TooltipProvider delayDuration={3000}>
      <div className="flex w-16 flex-col items-center justify-between bg-[#1e1e1e] py-4">
        <div className="flex flex-col items-center gap-4">
          {/* App Logo */}
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <span className="font-bold">S</span>
          </div>

          <nav className="flex flex-col gap-2 mt-4">
            <NavIcon icon={MessageSquare} label={t("Chats")} active={currentView === 'chat'} onClick={() => setCurrentView('chat')} />
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
                className="relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-white/10 active:scale-[0.98] text-gray-400"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
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

function NavIcon({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-white/10 active:scale-[0.98]",
            active ? "bg-white/20 text-white" : "text-gray-400"
          )}
        >
          <Icon className="h-5 w-5" />
          <span className="sr-only">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}