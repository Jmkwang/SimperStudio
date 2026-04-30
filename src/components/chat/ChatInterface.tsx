import { useAppStore } from '@/store/appStore';
import { WorkflowChatView } from './WorkflowChatView';
import { AgentTopologyView } from './AgentTopologyView';

export function ChatInterface() {
  const activeSession = useAppStore(state => state.getActiveSession());

  if (!activeSession) return <div className="flex-1 flex items-center justify-center">暂无活动会话</div>;

  if (activeSession.mode === 'workflow') {
    return <WorkflowChatView session={activeSession} />;
  }

  return <AgentTopologyView sessionId={activeSession.id} />;
}
