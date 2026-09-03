const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const guestFooterReplacement = `{/* Modal Footer */}
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
                onClick={() => setSelectedGuestModal(null)} 
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors shadow-sm"
              >
                Close
              </button>
            </div>`;

const reportFooterReplacement = `{/* Modal Footer */}
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
                onClick={() => setSelectedReportModal(null)} 
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Close Report
              </button>
            </div>`;

code = code.replace(
  /{[\s]*\/\* Modal Footer \*\/[\s]*<div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">[\s]*<button[\s]*onClick={\(\) => setSelectedGuestModal\(null\)}[\s]*className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors shadow-sm"[\s]*>[\s]*Close[\s]*<\/button>[\s]*<\/div>/g,
  guestFooterReplacement
);

code = code.replace(
  /{[\s]*\/\* Modal Footer \*\/[\s]*<div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">[\s]*<button[\s]*onClick={\(\) => setSelectedReportModal\(null\)}[\s]*className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"[\s]*>[\s]*Close Report[\s]*<\/button>[\s]*<\/div>/g,
  reportFooterReplacement
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
