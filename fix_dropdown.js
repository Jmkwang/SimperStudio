const fs = require('fs');

const path = 'src/components/workflow/WorkflowCanvas.tsx';
let code = fs.readFileSync(path, 'utf8');

// If DropdownMenu is missing, fallback to generic select/buttons or just simple buttons for now.
// I will just change it to a simple raw Select element since it's easier without shadcn dropdown installed

code = code.replace(
"import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';",
""
);

const newButtons = `           <select 
             className="h-9 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm border shadow-sm"
             onChange={(e) => {
               if(e.target.value) {
                 addNode(e.target.value, 'New ' + e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1));
                 e.target.value = ''; // reset
               }
             }}
           >
             <option value="">+ Add Node...</option>
             <option value="trigger">Trigger Node</option>
             <option value="agent">Agent Node</option>
             <option value="condition">Condition Node</option>
             <option value="subworkflow">SubWorkflow Node</option>
             <option value="action">Action Node</option>
             <option value="transformation">Data Transformation Node</option>
             <option value="output">Output Node</option>
           </select>`;

code = code.replace(/<DropdownMenu>[\s\S]*?<\/DropdownMenu>/, newButtons);

fs.writeFileSync(path, code);
