const fs = require('fs');
let code = fs.readFileSync('src/components/MinibarDashboard.tsx', 'utf8');

const replacement = `                            {currentUser?.role === 'admin' && (
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleEditReport(report)} 
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                                  title="Edit Record"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {canDelete && (
                                  <button 
                                    onClick={() => handleDeleteReport(report)} 
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" 
                                    title="Delete Record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}`;

// Because `currentUser?.role === 'admin' && (` appears multiple times maybe? Let's check exactly.
const targetCode = `{currentUser?.role === 'admin' && (
                              <button 
                                onClick={() => handleEditReport(report)} 
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors ml-2" 
                                title="Edit Record"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}`;

if (code.includes(targetCode)) {
  code = code.replace(targetCode, replacement);
  fs.writeFileSync('src/components/MinibarDashboard.tsx', code);
  console.log("Patched successfully");
} else {
  console.log("Target code not found!");
}
