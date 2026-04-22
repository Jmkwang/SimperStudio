const fs = require('fs');

const path = 'src/store/appStore.ts';
let code = fs.readFileSync(path, 'utf8');

// Add session 2 and 3
const sessionObjStr = `        {
          id: 'default-session',
          workspaceId: 'default-workspace',
          title: 'Project Planning',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [
            {
              id: uuidv4(),
              sessionId: 'default-session',
              role: 'system',
              content: { text: 'Session initialized.' },
              timestamp: Date.now()
            }
          ]
        }`;

const newSessions = sessionObjStr + `,
        {
          id: '2',
          workspaceId: 'default-workspace',
          title: 'UI Component Design',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        },
        {
          id: '3',
          workspaceId: 'default-workspace',
          title: 'General Inquiry',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        }`;

code = code.replace(sessionObjStr, newSessions);

// Add workflow w1, w2, w3
const workflowObjStr = `        {
          id: 'default-workflow',
          workspaceId: 'default-workspace',
          name: 'My First Workflow',
          nodes_data: [
             {
               id: 'trigger-1',
               type: 'trigger',
               position: { x: 100, y: 150 },
               data: { label: 'User Input' },
             },
             {
               id: 'agent-1',
               type: 'agent',
               position: { x: 400, y: 150 },
               data: { label: 'Summarizer', agentId: 'agent-1', prompt: 'Summarize the input text.' },
             },
             {
               id: 'output-1',
               type: 'output',
               position: { x: 750, y: 150 },
               data: { label: 'Chat Response' },
             },
          ],
          edges_data: [
             { id: 'e1-2', source: 'trigger-1', target: 'agent-1', animated: true },
             { id: 'e2-3', source: 'agent-1', target: 'output-1', animated: true },
          ],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }`;

const newWorkflows = workflowObjStr + `,
        {
          id: 'w1',
          workspaceId: 'default-workspace',
          name: 'Data Processing Pipeline',
          nodes_data: [],
          edges_data: [],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'w2',
          workspaceId: 'default-workspace',
          name: 'Weekly Report Generator',
          nodes_data: [],
          edges_data: [],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'w3',
          workspaceId: 'default-workspace',
          name: 'User Onboarding Flow',
          nodes_data: [],
          edges_data: [],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }`;

code = code.replace(workflowObjStr, newWorkflows);

fs.writeFileSync(path, code);
