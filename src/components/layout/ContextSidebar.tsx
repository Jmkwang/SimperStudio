import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/appStore"
import { useTranslation } from "@/hooks/useTranslation"
import { Plus } from "lucide-react"

export function ContextSidebar({ currentView }: { currentView: string }) {
  const setActiveSession = useAppStore(state => state.setActiveSession)
  const createSession = useAppStore(state => state.createSession)
  const createWorkflow = useAppStore(state => state.createWorkflow)
  const activeWorkspaceId = useAppStore(state => state.activeWorkspaceId)
  const setActiveWorkflow = useAppStore(state => state.setActiveWorkflow)
  const setActiveAgent = useAppStore(state => state.setActiveAgent)
  const sessions = useAppStore(state => state.sessions)
  const workflows = useAppStore(state => state.workflows)
  const agents = useAppStore(state => state.agents)

  const activeSessionId = useAppStore(state => state.activeSessionId)
  const activeWorkflowId = useAppStore(state => state.activeWorkflowId)
  const activeAgentId = useAppStore(state => state.activeAgentId)
  const { t } = useTranslation()

  // Determine content based on currentView
  const getSidebarContent = () => {
    switch (currentView) {
      case 'workflow':
        return {
          title: t('Workflows'),
          items: workflows.map(w => ({
            id: w.id,
            title: w.name,
            active: activeWorkflowId === w.id
          }))
        };
      case 'agents':
        return {
          title: t('Agents'),
          items: agents.map(a => ({
            id: a.id,
            title: a.name,
            active: activeAgentId === a.id
          }))
        };
      case 'settings':
        return {
          title: t('Settings'),
          items: [
            { id: 's1', title: t('General'), active: true },
            { id: 's2', title: t('Appearance'), active: false },
            { id: 's3', title: t('API Keys'), active: false },
          ]
        };
      case 'profile':
        return {
          title: t('Profile'),
          items: [
            { id: 'p1', title: t('My Account'), active: true },
            { id: 'p2', title: t('Billing'), active: false },
          ]
        };
      case 'prompts':
        return {
          title: t('Prompts'),
          items: [
            { id: 'pr1', title: t('System Prompts'), active: true },
            { id: 'pr2', title: t('Saved Templates'), active: false },
          ]
        };
      case 'chat':
      default:
        return {
          title: t('Chats'),
          items: sessions.map(s => ({
            id: s.id,
            title: s.title,
            active: activeSessionId === s.id
          }))
        };
    }
  };

  const content = getSidebarContent();

  const handleItemClick = (id: string) => {
    switch (currentView) {
      case 'chat':
      case undefined:
        setActiveSession(id);
        break;
      case 'workflow':
        setActiveWorkflow(id);
        break;
      case 'agents':
        setActiveAgent(id);
        break;
      case 'settings':
        console.log(`Switching to settings tab ${id}`);
        // Handle local settings tabs if needed
        break;
      case 'profile':
        console.log(`Switching to profile tab ${id}`);
        // Handle local profile tabs if needed
        break;
      default:
        console.log(`Clicked ${id} in ${currentView}`);
    }
  }

  return (
    <div className="flex w-64 flex-col border-r bg-background/50">
      <div className="p-4 border-b h-14 flex items-center justify-between">
        <h2 className="font-semibold text-sm">{content.title}</h2>
        {(currentView === 'chat' || !currentView || currentView === 'workflow') && (
          <button 
            onClick={() => {
              if (currentView === 'workflow') {
                createWorkflow(t('New Workflow'), activeWorkspaceId || 'default-workspace');
              } else {
                createSession(t('New Chat'), activeWorkspaceId || 'default-workspace');
              }
            }}
            className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
            title={currentView === 'workflow' ? t("New Workflow") : t("New Chat")}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-2">
        <div className="flex flex-col gap-1">
          {content.items.map(item => (
            <ContextItem
              key={item.id}
              title={item.title}
              active={item.active}
              onClick={() => handleItemClick(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ContextItem({ title, active = false, onClick }: { title: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-start rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50 active:scale-[0.98]",
        active ? "bg-muted font-medium text-primary" : "text-foreground"
      )}
    >
      <span className="truncate">{title}</span>
    </button>
  )
}