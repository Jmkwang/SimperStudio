import { useState } from "react"
import { cn } from "@/lib/utils"
import { Bot, ChevronLeft, Plus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAppStore } from '@/stores'
import { AgentDetailPopover } from "./AgentDetailPopover"

export function AgentsSidebar({
  agents,
  activeAgentId,
  setActiveAgent,
  t,
}: {
  agents: any[]
  activeAgentId: string | null
  setActiveAgent: (id: string) => void
  t: (key: string) => string
}) {
  const [view, setView] = useState<'categories' | 'agents'>('categories')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const updateAgent = useAppStore(state => state.updateAgent)

  // Group agents by category (fallback to industry, then 'Uncategorized')
  const grouped = agents.reduce((acc: Record<string, any[]>, agent: any) => {
    const category = agent.category || agent.industry || 'Uncategorized'
    if (!acc[category]) acc[category] = []
    acc[category].push(agent)
    return acc
  }, {} as Record<string, any[]>)

  const categories = Object.keys(grouped)

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    setView('agents')
  }

  const handleBackToCategories = () => {
    setView('categories')
    setSelectedCategory(null)
  }

  const handleAgentSave = (agentId: string, updates: Record<string, any>) => {
    updateAgent(agentId, updates)
  }

  // Category List View
  if (view === 'categories') {
    return (
      <div className="flex flex-col h-full overflow-auto py-2">
        <div className="flex flex-col gap-0.5 px-2">
          {/* Add New Agent */}
          <button
            onClick={() => setActiveAgent('__create_new__')}
            className="flex w-full items-center gap-2.5 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground rounded-xl mb-1"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{t('添加新助手')}</span>
          </button>

          {/* Category List */}
          {categories.map(category => {
            const catAgents = grouped[category]
            return (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className="flex w-full items-center justify-between px-3 h-10 text-sm text-foreground transition-all duration-400 ease-out hover:bg-hover rounded-xl border border-transparent hover:border-foreground/[0.06]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-foreground/[0.08]">
                    <Bot className="h-3 w-3" strokeWidth={1.5} />
                  </div>
                  <span>{category}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground/60">{catAgents.length}</span>
                  <ChevronLeft className="h-3 w-3 rotate-180 text-muted-foreground/40" strokeWidth={1.5} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Agent List View (for selected category)
  const catAgents = selectedCategory ? grouped[selectedCategory] || [] : []

  return (
    <div className="flex flex-col h-full overflow-auto py-2">
      <div className="flex flex-col gap-0.5 px-2">
        {/* Back Button */}
        <button
          onClick={handleBackToCategories}
          className="flex w-full items-center gap-2 px-3 h-9 text-xs text-muted-foreground transition-all duration-400 ease-out hover:text-foreground rounded-lg mb-1"
        >
          <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
          <span>{t('返回分类')}</span>
        </button>

        {/* Category Title */}
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-foreground">{selectedCategory}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{catAgents.length} {t('个助手')}</p>
        </div>

        {/* Agent List */}
        <div className="flex flex-col gap-0.5">
          {catAgents.map(agent => (
            <AgentDetailPopover
              key={agent.id}
              agent={agent}
              onSave={(updates) => handleAgentSave(agent.id, updates)}
            >
              <div
                className={cn(
                  "group relative flex w-full items-center text-sm rounded-xl transition-all duration-400 ease-out cursor-pointer",
                  activeAgentId === agent.id
                    ? "bg-primary/8 text-foreground border border-primary/10 glow-sm"
                    : "border border-transparent text-foreground hover:bg-hover hover:border-foreground/[0.06]"
                )}
              >
                {activeAgentId === agent.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
                )}
                <div className="min-w-0 flex-1 flex items-center gap-2.5 px-3 h-10">
                  <Avatar className="h-5 w-5 shrink-0 rounded-lg border border-foreground/[0.08]">
                    <AvatarImage src={agent.avatar} />
                    <AvatarFallback className="bg-transparent text-current text-[8px]">
                      {agent.name?.slice(0, 1) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="block truncate">{agent.name}</span>
                </div>
              </div>
            </AgentDetailPopover>
          ))}
        </div>
      </div>
    </div>
  )
}
