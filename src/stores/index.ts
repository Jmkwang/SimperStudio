import { create } from 'zustand';
import { createBaseSlice, BaseSlice } from './baseSlice';
import { createChatSlice, ChatSlice } from './chatSlice';
import { createModelSlice, ModelSlice } from './modelSlice';
import { createUISlice, UISlice } from './uiSlice';
import { createWorkflowSlice, WorkflowSlice } from './workflowSlice';
import { writeConfig } from './baseSlice';

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
