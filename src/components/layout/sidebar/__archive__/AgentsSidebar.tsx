import { useState } from 'react'
import { cn } from "@/lib/utils"
import { Bot, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SortableList } from "./SortableList"
import { useAppStore } from "@/stores"

export function AgentsSidebar({
  agents,
  agentCategories,
  addAgentCategory,
  selectedCategory,
  onSelectCategory,
  t,
}: {
  agents: any[]
  agentCategories: any[]
  addAgentCategory: (category: { name: string; description?: string }) => Promise<void>
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
  t: (key: string) => string
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const agentCategoryOrder = useAppStore(state => state.agentCategoryOrder)
  const setAgentCategoryOrder = useAppStore(state => state.setAgentCategoryOrder)

  // Merge agentCategories with categories inferred from agents
  const categoriesFromAgents = agents.reduce((acc: Record<string, number>, agent: any) => {
    const category = agent.category || agent.industry || 'Uncategorized'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Merge: store categories first, then agent-derived ones not in store
  const mergedCounts: Record<string, number> = { ...categoriesFromAgents }
  agentCategories.forEach((cat: any) => {
    if (!mergedCounts[cat.name]) mergedCounts[cat.name] = 0
  })

  let allCategoryNames = Object.keys(mergedCounts)

  // Sort by agentCategoryOrder if available
  if (agentCategoryOrder.length > 0) {
    allCategoryNames = [...allCategoryNames].sort((a, b) => {
      const idxA = agentCategoryOrder.indexOf(a)
      const idxB = agentCategoryOrder.indexOf(b)
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })
  } else {
    // Sort: store categories first, then by name
    allCategoryNames = allCategoryNames.sort((a, b) => {
      const aInStore = agentCategories.some((c: any) => c.name === a)
      const bInStore = agentCategories.some((c: any) => c.name === b)
      if (aInStore && !bInStore) return -1
      if (!aInStore && bInStore) return 1
      return a.localeCompare(b)
    })
  }

  const handleAddCategory = async () => {
    if (categoryName.trim()) {
      try {
        await addAgentCategory({ name: categoryName.trim() })
        setCategoryName('')
        setIsDialogOpen(false)
      } catch (e) {
        console.error('Failed to add category:', e)
        toast?.error?.(t('保存失败'), { description: String(e) })
      }
    }
  }

  const handleReorder = (items: typeof allCategoryNames) => {
    setAgentCategoryOrder(items)
  }

  return (
    <div className="flex flex-col h-full overflow-auto py-2">
      <div className="flex flex-col gap-0.5 px-2">
        {/* Add New Category */}
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex w-full items-center gap-2 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground rounded-xl mb-1"
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{t('添加智能体分类')}</span>
        </button>

        {/* Category List */}
        <SortableList
          items={allCategoryNames}
          getId={name => name}
          onReorder={handleReorder}
          className="flex flex-col gap-0.5"
        >
          {(category) => {
            const count = mergedCounts[category]
            const isSelected = selectedCategory === category
            return (
              <button
                onClick={() => onSelectCategory(isSelected ? null : category)}
                className={cn(
                  "flex w-full items-center justify-between px-3 h-10 text-sm transition-all duration-400 ease-out rounded-xl border",
                  isSelected
                    ? "bg-primary/8 text-foreground border-primary/10"
                    : "text-foreground border-transparent hover:bg-hover hover:border-foreground/[0.06]"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border",
                    isSelected ? "border-primary/20" : "border-foreground/[0.08]"
                  )}>
                    <Bot className="h-3 w-3" strokeWidth={1.5} />
                  </div>
                  <span>{category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/60">{count}</span>
                </div>
              </button>
            )
          }}
        </SortableList>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('添加新分类')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="categoryName">{t('分类名称')}</Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder={t('例如：市场营销')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory()
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              {t('取消')}
            </Button>
            <Button onClick={handleAddCategory} disabled={!categoryName.trim()}>
              {t('添加')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
