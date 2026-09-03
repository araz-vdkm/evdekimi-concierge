const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

if (!code.includes('ChevronLeft')) {
  code = code.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, ChevronLeft } from 'lucide-react';");
}

code = code.replace(
  `interface DashboardProps {
  spreadsheetId: string;
  initialSearchTerm?: string;
  initialTab?: 'overview' | 'list' | 'pre-checkin' | 'post-checkout';
}`,
  `interface DashboardProps {
  spreadsheetId: string;
  initialSearchTerm?: string;
  initialTab?: 'overview' | 'list' | 'pre-checkin' | 'post-checkout';
  onComplete?: () => void;
}`
);

code = code.replace(
  `export default function Dashboard({ spreadsheetId, initialSearchTerm, initialTab }: DashboardProps) {`,
  `export default function Dashboard({ spreadsheetId, initialSearchTerm, initialTab, onComplete }: DashboardProps) {`
);

const renderMatch = `  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>`;
const renderReplace = `  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full">
      {onComplete && (
        <button 
          onClick={onComplete}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Return to Home Menu
        </button>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>`;

code = code.replace(renderMatch, renderReplace);
fs.writeFileSync('src/components/Dashboard.tsx', code);
