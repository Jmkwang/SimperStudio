const fs = require('fs');

const path = 'src/components/workflow/WorkflowCanvas.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add DropdownMenu imports
if (!code.includes('DropdownMenu')) {
    code = code.replace(
        "import { Plus, Save } from 'lucide-react';",
        "import { Plus, Save, ChevronDown } from 'lucide-react';\nimport { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';"
    );
}

// 2. Add node functions
const addAgentNodeFunc = `  const addAgentNode = () => {
    const newNode: Node = {
      id: \`agent-\${nodes.length + 1}-\${Date.now()}\`,
      type: 'agent',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { label: 'New Agent Task', agentId: '', prompt: 'Configure me.' },
    };
    setNodes((nds) => [...nds, newNode]);
  };`;

const allNodeFuncs = `  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: \`\${type}-\${nodes.length + 1}-\${Date.now()}\`,
      type: type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { label: label, ...(type === 'agent' ? { agentId: '', prompt: 'Configure me.' } : {}) },
    };
    setNodes((nds) => [...nds, newNode]);
  };`;

code = code.replace(addAgentNodeFunc, allNodeFuncs);

// 3. Replace Button with DropdownMenu
const oldButtons = `           <Button onClick={addAgentNode} variant="secondary" size="sm" className="shadow-sm">
             <Plus className="h-4 w-4 mr-2" /> Add Agent Node
           </Button>`;

const newButtons = `           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="secondary" size="sm" className="shadow-sm">
                 <Plus className="h-4 w-4 mr-2" /> Add Node <ChevronDown className="h-4 w-4 ml-2" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent>
               <DropdownMenuItem onClick={() => addNode('trigger', 'New Trigger')}>Trigger Node</DropdownMenuItem>
               <DropdownMenuItem onClick={() => addNode('agent', 'New Agent Task')}>Agent Node</DropdownMenuItem>
               <DropdownMenuItem onClick={() => addNode('condition', 'New Condition')}>Condition Node</DropdownMenuItem>
               <DropdownMenuItem onClick={() => addNode('subworkflow', 'New SubWorkflow')}>SubWorkflow Node</DropdownMenuItem>
               <DropdownMenuItem onClick={() => addNode('action', 'New Action')}>Action Node</DropdownMenuItem>
               <DropdownMenuItem onClick={() => addNode('transformation', 'New Transformation')}>Data Transformation Node</DropdownMenuItem>
               <DropdownMenuItem onClick={() => addNode('output', 'New Output')}>Output Node</DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>`;

code = code.replace(oldButtons, newButtons);

fs.writeFileSync(path, code);
