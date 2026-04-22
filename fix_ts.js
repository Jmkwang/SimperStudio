const fs = require('fs');

let appPath = 'src/App.tsx';
let appCode = fs.readFileSync(appPath, 'utf8');
appCode = appCode.replace('import { Button } from "@/components/ui/button";\n', '');
appCode = appCode.replace('import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";\n', '');
fs.writeFileSync(appPath, appCode);

let sbPath = 'src/components/layout/GlobalSidebar.tsx';
let sbCode = fs.readFileSync(sbPath, 'utf8');
sbCode = sbCode.replace('LayoutDashboard, ', '');
fs.writeFileSync(sbPath, sbCode);

