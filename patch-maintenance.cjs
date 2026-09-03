const fs = require('fs');
let code = fs.readFileSync('src/components/MaintenanceDashboard.tsx', 'utf8');

// Add state for confirming reopen
if (!code.includes('isConfirmingReopen')) {
  code = code.replace(/const \[isFilterMenuOpen, setIsFilterMenuOpen\] = useState\(false\);/, 
    "const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);\n  const [isConfirmingReopen, setIsConfirmingReopen] = useState<string | null>(null);");
}

code = code.replace(/if \(!window\.confirm\("Are you sure you want to reopen this maintenance ticket\?"\)\) return;/g, "");

const oldBtn = `<button
                      onClick={() => handleReopenTicket(ticket)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Re-open Ticket</span>
                    </button>`;

const newBtn = `isConfirmingReopen === ticket.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-600">Reopen?</span>
                        <button onClick={() => { handleReopenTicket(ticket); setIsConfirmingReopen(null); }} className="px-2 py-1 bg-slate-900 text-white rounded text-xs font-bold">Yes</button>
                        <button onClick={() => setIsConfirmingReopen(null)} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsConfirmingReopen(ticket.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Re-open Ticket</span>
                      </button>
                    )`;

if (code.includes('onClick={() => handleReopenTicket(ticket)}')) {
  code = code.replace(oldBtn, newBtn);
  fs.writeFileSync('src/components/MaintenanceDashboard.tsx', code);
  console.log("Maintenance replaced");
}
