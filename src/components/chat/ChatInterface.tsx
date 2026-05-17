import { useAppStore } from '@/stores';
import { WorkflowChatView } from './WorkflowChatView';
import { SimpleChatView } from './SimpleChatView';
import { WorkflowTopologyPreview } from '@/components/workflow/WorkflowTopologyPreview';
import { DebugBadge } from '@/components/debug/DebugBadge';

export function ChatInterface() {
  const activeSession = useAppStore(state => state.getActiveSession());
  const workflows = useAppStore(state => state.workflows);
  const selectedChatWorkflowId = useAppStore(state => state.selectedChatWorkflowId);

  if (!activeSession) {
    const selectedWorkflow = selectedChatWorkflowId
      ? workflows.find(w => w.id === selectedChatWorkflowId)
      : undefined;

    if (selectedWorkflow) {
      return (
        <div className="relative flex-1 flex flex-col h-full">
          <DebugBadge id="ChatInterface" />
          <WorkflowTopologyPreview key={selectedWorkflow.id} workflow={selectedWorkflow} />
        </div>
      );
    }

    return (
      <div className="relative flex-1 flex items-center justify-center">
        <DebugBadge id="ChatInterface" />
        No active session
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col h-full">
      <DebugBadge id="ChatInterface" />
      {activeSession.mode === 'workflow' ? (
        <WorkflowChatView key={activeSession.id} session={activeSession} />
      ) : (
        <SimpleChatView key={activeSession.id} session={activeSession} />
      )}
    </div>
  );
}
