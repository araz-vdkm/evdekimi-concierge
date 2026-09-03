const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const targetGuest = `{/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {canDelete ? (
                <button
                  onClick={() => handleDeleteGuest(selectedGuestModal)}
                  className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : <div></div>}
              <button 
                onClick={() => { setSelectedGuestModal(null); setIsConfirmingDelete(false); }} 
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors shadow-sm"
              >
                Close
              </button>
            </div>`;

const targetReport = `{/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              {canDelete ? (
                <button
                  onClick={() => handleDeleteReport(selectedReportModal)}
                  className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : <div></div>}
              <button 
                onClick={() => { setSelectedReportModal(null); setIsConfirmingDelete(false); }} 
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Close Report
              </button>
            </div>`;

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
              ) : <div></div>}
              <button 
                onClick={() => { setSelectedGuestModal(null); setIsConfirmingDelete(false); }} 
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors shadow-sm"
              >
                Close
              </button>
            </div>`;

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
              ) : <div></div>}
              <button 
                onClick={() => { setSelectedReportModal(null); setIsConfirmingDelete(false); }} 
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Close Report
              </button>
            </div>`;

if (code.includes("onClick={() => handleDeleteGuest(selectedGuestModal)}")) {
  code = code.replace(targetGuest, guestFooterReplacement);
  console.log("Guest replaced");
}
if (code.includes("onClick={() => handleDeleteReport(selectedReportModal)}")) {
  code = code.replace(targetReport, reportFooterReplacement);
  console.log("Report replaced");
}

fs.writeFileSync('src/components/Dashboard.tsx', code);
