const fs = require('fs');
let code = fs.readFileSync('src/components/MaintenanceDashboard.tsx', 'utf8');

if (!code.includes('isConfirmingDeleteTicket')) {
  code = code.replace(/const \[isConfirmingReopen, setIsConfirmingReopen\] = useState<string \| null>\(null\);/, 
    "const [isConfirmingReopen, setIsConfirmingReopen] = useState<string | null>(null);\n  const [isConfirmingDeleteTicket, setIsConfirmingDeleteTicket] = useState<string | null>(null);");
}

const delFunc = `  const handleDeleteTicket = async (ticket: MaintenanceTicket) => {
    try {
      await deleteRecord('maintenance_tickets', ticket.id);
      setTickets(prev => prev.filter(t => t.id !== ticket.id));
      setIsConfirmingDeleteTicket(null);
    } catch (err) {
      console.error("Failed to delete ticket:", err);
      alert("Failed to delete maintenance ticket.");
    }
  };`;

if (!code.includes('handleDeleteTicket')) {
  code = code.replace(/const handleReopenTicket/, delFunc + "\n\n  const handleReopenTicket");
}

const btnCode = `                  {/* View Details modal */}
                  <button
                    onClick={() => setSelectedTicketDetail(ticket)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>
                  
                  {/* Delete button (Admin only) */}
                  {canDelete && (
                    isConfirmingDeleteTicket === ticket.id ? (
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[10px] font-bold text-rose-600">Delete?</span>
                        <button onClick={() => handleDeleteTicket(ticket)} className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-bold">Yes</button>
                        <button onClick={() => setIsConfirmingDeleteTicket(null)} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsConfirmingDeleteTicket(ticket.id)}
                        className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors ml-2"
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}`;

if (!code.includes('handleDeleteTicket(ticket)')) {
  code = code.replace(/{[\s]*\/\* View Details modal \*\/[\s\S]*?<\/button>/, btnCode);
  fs.writeFileSync('src/components/MaintenanceDashboard.tsx', code);
  console.log("Maintenance patched");
}

