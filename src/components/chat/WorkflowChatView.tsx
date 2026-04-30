import { ChatSession } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { WorkflowAgentWindow } from './WorkflowAgentWindow';

export function WorkflowChatView({ session }: { session: ChatSession }) {
  const workflows = useAppStore(state => state.workflows);
  const openWorkflowAgentWindow = useAppStore(state => state.openWorkflowAgentWindow);
  const workflowChatUI = useAppStore(state => state.workflowChatUI);
  const { t } = useTranslation();

  const workflow = session.workflowId ? workflows.find(item => item.id === session.workflowId) : undefined;
  const agentNodes = (workflow?.nodes_data || []).filter(node => node.type === 'agent' && node.data?.agentId);

  if (!workflow) {
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">{t('Current session is not linked to a workflow.')}</div>;
  }

  const sessionWindows = workflowChatUI.windows.filter(window => window.sessionId === session.id);

  return (
    <div className="relative flex h-full flex-col p-6 gap-4 overflow-hidden">
      <div>
        <h2 className="text-lg font-semibold">{workflow.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('Choose a node to open its conversation window.')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {agentNodes.map(node => (
          <Button
            key={node.id}
            variant="outline"
            className="h-auto justify-start px-4 py-3 text-left"
            onClick={() => openWorkflowAgentWindow(session.id, workflow.id, node.id, node.data.agentId)}
          >
            <div>
              <div className="font-medium">{node.data?.label || node.id}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('Agent ID')}: {node.data.agentId}</div>
            </div>
          </Button>
        ))}
      </div>

      {agentNodes.length === 0 && (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{t('This workflow has no agent nodes yet.')}</div>
      )}

      {sessionWindows.map(windowData => (
        <WorkflowAgentWindow key={windowData.id} windowData={windowData} />
      ))}
    </div>
  );
}
