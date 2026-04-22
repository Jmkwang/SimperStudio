import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { AgentsView } from "@/components/agents/AgentsView";
import { SettingsView } from "@/components/settings/SettingsView";
import { ProfileView } from "@/components/profile/ProfileView";
import { useAppStore } from "@/store/appStore";
import { Toaster } from "@/components/ui/toaster";

type ViewMode = 'chat' | 'workflow' | 'agents' | 'workspaces' | 'settings' | 'profile';

function App() {
  const activeSession = useAppStore(state => state.getActiveSession());
  const [viewMode, setViewMode] = useState<ViewMode>('chat');

  const renderContent = () => {
    switch (viewMode) {
      case 'chat':
        return <ChatInterface />;
      case 'workflow':
        return <WorkflowCanvas />;
      case 'agents':
        return <AgentsView />;
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

  const getHeaderTitle = () => {
    switch (viewMode) {
      case 'chat': return activeSession?.title || 'No Session';
      case 'workflow': return 'Workflow Editor';
      case 'agents': return 'Agent Management';
      case 'workspaces': return 'Workspaces';
      case 'settings': return 'Settings';
      case 'profile': return 'User Profile';
      default: return 'SimperStudio';
    }
  };

  return (
    <AppShell currentView={viewMode} setCurrentView={(v) => setViewMode(v as ViewMode)}>
      <div className="flex flex-col h-full">
        {/* Header Area */}
        <header className="h-14 border-b flex items-center px-6 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 relative">
          <h1 className="text-lg font-semibold tracking-tight capitalize">
            {getHeaderTitle()}
          </h1>

          <div className="ml-auto flex items-center gap-4">
            {/* Info button hidden as requested */}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {renderContent()}
        </div>
      </div>
      <Toaster />
    </AppShell>
  );
}

export default App;