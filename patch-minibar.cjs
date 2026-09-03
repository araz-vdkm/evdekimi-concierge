const fs = require('fs');
let code = fs.readFileSync('src/components/MinibarDashboard.tsx', 'utf8');

const targetFunc = `const handleDeleteReport = async (report: any) => {
    
    try {
      await deleteRecord('minibar', report.id);
      setReports(prev => prev.filter(r => r.id !== report.id));
    } catch (e) {
      alert("Failed to delete minibar log.");
    }
  };`;

const newFunc = `const handleDeleteReport = async (report: any) => {
    try {
      if (report.manualLogs) {
        for (const log of report.manualLogs) {
          await deleteRecord('minibar', log.id);
        }
      }
      if (report.preCheckIn) {
        const updatedPre = { ...report.preCheckIn, minibarConsumed: [], totalMinibar: 0 };
        await saveRecord('pre_checkin', report.bookingId || report.id, updatedPre);
      }
      if (report.postCheckOut) {
        const updatedPost = { ...report.postCheckOut, minibarConsumed: [], totalMinibar: 0 };
        await saveRecord('post_checkout', report.bookingId || report.id, updatedPost);
      }
      setReports(prev => prev.filter(r => r.bookingId !== report.bookingId));
      setIsConfirmingDelete(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete minibar log.");
    }
  };`;

code = code.replace(targetFunc, newFunc);

const targetBtn = `isConfirmingDelete === report.id ? (
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
                                  )`;

const newBtn = `isConfirmingDelete === report.bookingId ? (
                                    <div className="flex items-center gap-1 ml-1 bg-rose-50 rounded px-2 py-1">
                                      <span className="text-[10px] text-rose-600 font-medium">Delete?</span>
                                      <button onClick={() => handleDeleteReport(report)} className="p-1 bg-rose-600 text-white rounded text-[10px] font-bold">Yes</button>
                                      <button onClick={() => setIsConfirmingDelete(null)} className="p-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">No</button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => setIsConfirmingDelete(report.bookingId)} 
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" 
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )`;

code = code.replace(targetBtn, newBtn);

fs.writeFileSync('src/components/MinibarDashboard.tsx', code);
