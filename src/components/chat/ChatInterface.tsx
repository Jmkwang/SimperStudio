import { useAppStore } from '@/store/appStore';
import { WorkflowChatView } from './WorkflowChatView';
import { SimpleChatView } from './SimpleChatView';

export function ChatInterface() {
  const activeSession = useAppStore(state => state.getActiveSession());

  if (!activeSession) return <div className="flex-1 flex items-center justify-center">No active session</div>;

  if (activeSession.mode === 'workflow') {
    return <WorkflowChatView key={activeSession.id} session={activeSession} />;
  }

  return <SimpleChatView key={activeSession.id} session={activeSession} />;
}
