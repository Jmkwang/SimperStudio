import { useAppStore } from '@/stores';
import { WorkflowChatView } from './WorkflowChatView';
import { SimpleChatView } from './SimpleChatView';
import { DebugBadge } from '@/components/debug/DebugBadge';

export function ChatInterface() {
  const activeSession = useAppStore(state => state.getActiveSession());

  if (!activeSession) return (
    <div className="relative flex-1 flex items-center justify-center">
      <DebugBadge id="ChatInterface" />
      No active session
    </div>
  );

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
