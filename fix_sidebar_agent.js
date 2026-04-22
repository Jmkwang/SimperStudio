const fs = require('fs');

const path = 'src/components/layout/ContextSidebar.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const setActiveWorkflow = useAppStore(state => state.setActiveWorkflow)',
  'const setActiveWorkflow = useAppStore(state => state.setActiveWorkflow)\n  const setActiveAgent = useAppStore(state => state.setActiveAgent)'
);

code = code.replace(
  'const workflows = useAppStore(state => state.workflows)',
  'const workflows = useAppStore(state => state.workflows)\n  const agents = useAppStore(state => state.agents)'
);

code = code.replace(
  'const activeWorkflowId = useAppStore(state => state.activeWorkflowId)',
  'const activeWorkflowId = useAppStore(state => state.activeWorkflowId)\n  const activeAgentId = useAppStore(state => state.activeAgentId)'
);

const oldAgentReturn = `        return {
          title: 'Agents',
          items: [
            { id: 'a1', title: 'Code Assistant', active: false },
            { id: 'a2', title: 'Data Analyst', active: false },
            { id: 'a3', title: 'Copywriter', active: false },
          ]
        };`;

const newAgentReturn = `        return {
          title: 'Agents',
          items: agents.map(a => ({
            id: a.id,
            title: a.name,
            active: activeAgentId === a.id
          }))
        };`;

code = code.replace(oldAgentReturn, newAgentReturn);

code = code.replace(
  'console.log(`Switching to agent ${id}`);\n        // Add setActiveAgent logic if it existed, otherwise just log',
  'setActiveAgent(id);'
);

fs.writeFileSync(path, code);
