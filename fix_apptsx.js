const fs = require('fs');
const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

// The first attempt might have failed due to patch mismatch, so let's ensure Toaster is there
if (!code.includes('import { Toaster } from "@/components/ui/toaster"')) {
    code = code.replace(
        'import { useAppStore } from "@/store/appStore";', 
        'import { useAppStore } from "@/store/appStore";\nimport { Toaster } from "@/components/ui/toaster";'
    );
}

if (!code.includes('<Toaster />')) {
    code = code.replace(
        '</AppShell>',
        '  <Toaster />\n    </AppShell>'
    );
}

fs.writeFileSync(path, code);
