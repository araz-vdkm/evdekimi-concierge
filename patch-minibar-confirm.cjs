const fs = require('fs');
let code = fs.readFileSync('src/components/MinibarDashboard.tsx', 'utf8');

if (!code.includes('isConfirmingDelete')) {
  code = code.replace(/const \[editingReport, setEditingReport\] = useState<any>\(null\);/, 
    "const [editingReport, setEditingReport] = useState<any>(null);\n  const [isConfirmingDelete, setIsConfirmingDelete] = useState<string | null>(null);");
}

code = code.replace(/if \(!window\.confirm\(\`Are you sure you want to delete this minibar log\?\`\)\) return;/g, "");

const oldBtnCode = `{canDelete && (
                                  <button 
                                    onClick={() => handleDeleteReport(report)} 
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" 
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}`;

const newBtnCode = `{canDelete && (
                                  isConfirmingDelete === report.id ? (
                                    <div className="flex items-center gap-1 ml-1 bg-rose-50 rounded px-2 py-1">
                                      <span className="text-[10px] text-rose-600 font-medium">Delete?</span>
                                      <button onClick={() => handleDeleteReport(report)} className="p-1 bg-rose-600 text-white rounded text-[10px] font-bold">Yes</button>
                                      <button onClick={() => setIsConfirmingDelete(null)} className="p-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">No</button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => setIsConfirmingDelete(report.id)} 
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" 
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )
                                )}`;

code = code.replace(oldBtnCode, newBtnCode);

fs.writeFileSync('src/components/MinibarDashboard.tsx', code);
