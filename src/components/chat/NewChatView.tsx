import { useState, useMemo } from 'react';
import { useAppStore } from '@/stores';
import { useTranslation } from '@/hooks/useTranslation';
import { Bot, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DebugBadge } from '@/components/debug/DebugBadge';

export function NewChatView() {
  const { t } = useTranslation();
  const agents = useAppStore(state => state.agents);
  const agentCategories = useAppStore(state => state.agentCategories);
  const activeWorkspaceId = useAppStore(state => state.activeWorkspaceId);
  const createSession = useAppStore(state => state.createSession);
  const setActiveAgent = useAppStore(state => state.setActiveAgent);
  const setCurrentView = useAppStore(state => state.setCurrentView);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Categories: merge store categories + agent-derived categories
  const categoriesFromAgents = agents.reduce((acc: Record<string, number>, agent: any) => {
    const category = agent.category || agent.industry || 'General';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mergedCounts: Record<string, number> = { ...categoriesFromAgents };
  agentCategories.forEach((cat: any) => {
    if (!mergedCounts[cat.name]) mergedCounts[cat.name] = 0;
  });

  const allCategoryNames = useMemo(() =>
    Object.keys(mergedCounts).sort((a, b) => {
      const aInStore = agentCategories.some((c: any) => c.name === a);
      const bInStore = agentCategories.some((c: any) => c.name === b);
      if (aInStore && !bInStore) return -1;
      if (!aInStore && bInStore) return 1;
      return a.localeCompare(b);
    }),
    [mergedCounts, agentCategories]
  );

  const filteredAgents = useMemo(() =>
    agents.filter((a: any) => {
      const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || (a.category || a.industry || 'General') === selectedCategory;
      return matchesSearch && matchesCategory;
    }),
    [agents, searchQuery, selectedCategory]
  );

  const handleCreateSession = (agentId: string) => {
    const agent = agents.find((a: any) => a.id === agentId);
    if (!agent) return;
    createSession(agent.name, activeWorkspaceId || 'default-workspace', undefined, 'single');
    setActiveAgent(agentId);
    setCurrentView('chat');
  };

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden">
      <DebugBadge id="NewChatView" position="bottom-left" />
      <div className="border-b px-6 py-3 shrink-0">
        <h2 className="text-lg font-semibold">{t('新增会话')}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{t('选择一个智能体开始对话')}</p>
      </div>

      {/* Search */}
      <div className="px-6 py-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('搜索智能体...')}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="flex flex-1 min-h-0 px-6 pb-4 gap-4">
        {/* Category sidebar */}
        <div className="w-[160px] flex-shrink-0 flex flex-col gap-0.5 overflow-auto border-r border-border pr-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "flex w-full items-center justify-between px-3 h-10 text-sm transition-all duration-200 rounded-xl border",
              selectedCategory === null
                ? "bg-primary/8 text-foreground border-primary/10 font-medium"
                : "text-foreground border-transparent hover:bg-hover hover:border-foreground/[0.06]"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border",
                selectedCategory === null ? "border-primary/20" : "border-foreground/[0.08]"
              )}>
                <Bot className="h-3 w-3" strokeWidth={1.5} />
              </div>
              <span>{t('全部')}</span>
            </div>
            <span className="text-xs text-muted-foreground/60">{agents.length}</span>
          </button>

          {allCategoryNames.map((cat) => {
            const count = mergedCounts[cat];
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? null : cat)}
                className={cn(
                  "flex w-full items-center justify-between px-3 h-10 text-sm transition-all duration-200 rounded-xl border",
                  isSelected
                    ? "bg-primary/8 text-foreground border-primary/10 font-medium"
                    : "text-foreground border-transparent hover:bg-hover hover:border-foreground/[0.06]"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border",
                    isSelected ? "border-primary/20" : "border-foreground/[0.08]"
                  )}>
                    <Bot className="h-3 w-3" strokeWidth={1.5} />
                  </div>
                  <span className="truncate">{cat}</span>
                </div>
                <span className="text-xs text-muted-foreground/60 shrink-0 ml-1">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Agent grid */}
        <div className="flex-1 overflow-auto min-w-0">
          {filteredAgents.length === 0 && (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {t('暂无智能体')}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAgents.map((agent: any) => (
              <button
                key={agent.id}
                onClick={() => handleCreateSession(agent.id)}
                className="text-left rounded-xl border p-4 flex flex-col transition-all duration-200 bg-card hover:border-primary/40 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3 mb-2">
                  <TooltipProvider delayDuration={800}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-10 w-10 rounded-full border shadow-sm cursor-help shrink-0">
                          <AvatarImage src={agent.avatar} />
                          <AvatarFallback className="rounded-full bg-primary/10 text-primary">
                            <Bot className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px]">
                        <p className="text-xs leading-relaxed">
                          {agent.systemPrompt?.slice(0, 120) || t('无系统提示词')}
                          {(agent.systemPrompt?.length || 0) > 120 ? '...' : ''}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold truncate">{agent.name}</h4>
                    <p className="text-xs text-muted-foreground font-mono truncate">{t('ID')}: {agent.id}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {agent.description || agent.systemPrompt || t('无描述')}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
