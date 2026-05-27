import { create } from 'zustand';
import { createBaseSlice, BaseSlice } from './baseSlice';
import { createChatSlice, ChatSlice } from './chatSlice';
import { createModelSlice, ModelSlice } from './modelSlice';
import { createUISlice, UISlice } from './uiSlice';
import { createWorkflowSlice, WorkflowSlice } from './workflowSlice';
import { writeConfig } from './baseSlice';
import { debugLogger } from '@/lib/debugLogger';

export type { BaseSlice } from './baseSlice';
export type { ChatSlice } from './chatSlice';
export type { ModelSlice } from './modelSlice';
export type { UISlice } from './uiSlice';
export type { WorkflowSlice } from './workflowSlice';
export type { WorkflowExecutionState } from './workflowSlice';

export type AppStore = BaseSlice & ChatSlice & ModelSlice & UISlice & WorkflowSlice;

export const useAppStore = create<AppStore>()((set, get) => ({
  ...createBaseSlice(set, get),
  ...createChatSlice(set, get),
  ...createModelSlice(set, get, writeConfig),
  ...createUISlice(set, get, writeConfig),
  ...createWorkflowSlice(set, get),
}));

// Debug: track state changes
const STATE_KEYS_TO_TRACK = [
  'activeSessionId', 'activeWorkflowId', 'activeAgentId', 'activeWorkspaceId',
  'currentView', 'debugMode', 'chatLayoutMode', 'contextSidebarTab',
  'selectedChatWorkflowId', 'selectedAgentCategory',
] as const;

let _prevTrackedState: Record<string, unknown> = {};
useAppStore.subscribe((state) => {
  if (!state.debugMode) return;
  const stateRecord = state as unknown as Record<string, unknown>;
  const changed: string[] = [];
  for (const key of STATE_KEYS_TO_TRACK) {
    if (stateRecord[key] !== _prevTrackedState[key]) {
      changed.push(key);
    }
  }
  if (changed.length > 0) {
    const details: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of changed) {
      details[key] = { from: _prevTrackedState[key], to: stateRecord[key] };
    }
    debugLogger.log('state_change', 'store', `changed: ${changed.join(', ')}`, details);
  }
  // Update snapshot
  const snapshot: Record<string, unknown> = {};
  for (const key of STATE_KEYS_TO_TRACK) {
    snapshot[key] = stateRecord[key];
  }
  _prevTrackedState = snapshot;
});
