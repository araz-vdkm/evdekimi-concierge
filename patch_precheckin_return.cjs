const fs = require('fs');
let code = fs.readFileSync('src/components/PreCheckInFlow.tsx', 'utf8');

if (!code.includes('ChevronLeft')) {
  code = code.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, ChevronLeft } from 'lucide-react';");
}

const renderMatch = `  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 sm:py-8">`;
const renderReplace = `  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 sm:py-8">
      <button 
        onClick={onComplete}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Return to Home Menu
      </button>`;

code = code.replace(renderMatch, renderReplace);
fs.writeFileSync('src/components/PreCheckInFlow.tsx', code);
