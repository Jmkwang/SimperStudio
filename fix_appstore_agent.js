const fs = require('fs');

const path = 'src/store/appStore.ts';
let code = fs.readFileSync(path, 'utf8');

// Add activeAgentId
if (!code.includes('activeAgentId: string | null;')) {
    code = code.replace(
        'activeWorkflowId: string | null;',
        'activeWorkflowId: string | null;\n  activeAgentId: string | null;'
    );
    
    code = code.replace(
        'setActiveWorkflow: (id: string | null) => void;',
        'setActiveWorkflow: (id: string | null) => void;\n  setActiveAgent: (id: string | null) => void;'
    );
    
    code = code.replace(
        "activeWorkflowId: 'default-workflow',",
        "activeWorkflowId: 'default-workflow',\n      activeAgentId: 'agent-1',"
    );
    
    code = code.replace(
        'setActiveWorkflow: (id) => set({ activeWorkflowId: id }),',
        'setActiveWorkflow: (id) => set({ activeWorkflowId: id }),\n      setActiveAgent: (id) => set({ activeAgentId: id }),'
    );
}

fs.writeFileSync(path, code);
