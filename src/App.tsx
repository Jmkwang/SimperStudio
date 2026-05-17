import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { AgentsView } from "@/components/agents/AgentsView";
import { SettingsView } from "@/components/settings/SettingsView";
import { ProfileView } from "@/components/profile/ProfileView";
import { PromptGenerator } from "@/components/prompts/PromptGenerator";
import { useAppStore } from '@/stores';
import { Toaster } from "@/components/ui/toaster";
import { WorkflowNodePanel } from "@/components/layout/WorkflowNodePanel";

type ViewMode = 'chat' | 'workflow' | 'agents' | 'workspaces' | 'settings' | 'profile' | 'prompts';

function App() {
  const fetchInitialData = useAppStore(state => state.fetchInitialData);
  const fontSize = useAppStore(state => state.settings.fontSize);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Apply font size to document root
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize ?? 100}%`;
  }, [fontSize]);

  const renderContent = () => {
    switch (viewMode) {
      case 'chat':
        return <ChatInterface />;
      case 'workflow':
        return <WorkflowCanvas />;
      case 'agents':
        return <AgentsView />;
      case 'prompts':
        return <PromptGenerator />;
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>{viewMode} view coming soon...</p>
          </div>
        );
    }
  };

  return (
    <AppShell
      currentView={viewMode}
      setCurrentView={(v) => setViewMode(v as ViewMode)}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 relative overflow-hidden flex">
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderContent()}
          </div>
          <WorkflowNodePanel currentView={viewMode} />
        </div>
      </div>
      <Toaster />
    </AppShell>
  );
}

export default App;