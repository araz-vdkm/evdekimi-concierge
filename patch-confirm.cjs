const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

if (!code.includes('isConfirmingDelete')) {
  code = code.replace(/const \[selectedReportModal, setSelectedReportModal\] = useState<any | null>\(null\);/, 
    "const [selectedReportModal, setSelectedReportModal] = useState<any | null>(null);\n  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);");
    
  // reset confirm state when closing modals
  code = code.replace(/setSelectedGuestModal\(null\)/g, "setSelectedGuestModal(null); setIsConfirmingDelete(false);");
  code = code.replace(/setSelectedReportModal\(null\)/g, "setSelectedReportModal(null); setIsConfirmingDelete(false);");
}

code = code.replace(/if \(!window\.confirm\("Are you sure you want to delete this guest registration\?"\)\) return;/g, "");
code = code.replace(/if \(!window\.confirm\(\`Are you sure you want to delete this \${report.type} report\?\`\)\) return;/g, "");

const guestFooterReplacement = `{/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {canDelete ? (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-rose-600">Delete this?</span>
                    <button onClick={() => handleDeleteGuest(selectedGuestModal)} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-bold">Yes</button>
                    <button onClick={() => setIsConfirmingDelete(false)} className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-sm font-bold">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )
              ) : <div></div>}`;

const reportFooterReplacement = `{/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              {canDelete ? (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-rose-600">Delete this?</span>
                    <button onClick={() => handleDeleteReport(selectedReportModal)} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-bold">Yes</button>
                    <button onClick={() => setIsConfirmingDelete(false)} className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-sm font-bold">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )
              ) : <div></div>}`;

// use regex to safely replace the old buttons block 
code = code.replace(/{[\s]*\/\* Modal Footer \*\/[\s]*<div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">[\s]*{canDelete \? \([\s\S]*?\) : <div><\/div>}/, guestFooterReplacement);
code = code.replace(/{[\s]*\/\* Modal Footer \*\/[\s]*<div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">[\s]*{canDelete \? \([\s\S]*?\) : <div><\/div>}/, reportFooterReplacement);

fs.writeFileSync('src/components/Dashboard.tsx', code);
