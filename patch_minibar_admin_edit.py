import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
old_import = "import { Coffee, ChevronLeft, Camera, Plus, Save, Trash2, Calendar, FileText, CheckCircle2, TrendingUp, TrendingDown, ArrowRight , Download} from 'lucide-react';"
new_import = "import { Coffee, ChevronLeft, Camera, Plus, Save, Trash2, Calendar, FileText, CheckCircle2, TrendingUp, TrendingDown, ArrowRight , Download, Pencil, X} from 'lucide-react';"
content = content.replace(old_import, new_import)

# 2. Add state variables inside MinibarDashboard
state_anchor = "const [isSubmitting, setIsSubmitting] = useState(false);"
new_state = """const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<Record<string, { initial: number, postOut: number }>>({});"""
content = content.replace(state_anchor, new_state)

# 3. Add edit functions
func_anchor = "const fetchTrackingReports = async () => {"
new_funcs = """
  const handleEditReport = (report: any) => {
    const formData: Record<string, { initial: number, postOut: number }> = {};
    PREDEFINED_ITEMS.forEach(item => {
      const preItem = report.preCheckIn?.minibarConsumed?.find((i:any) => i.name === item.name);
      const postItem = report.postCheckOut?.minibarConsumed?.find((i:any) => i.name === item.name);
      formData[item.name] = {
        initial: preItem ? preItem.qtyConsumed : 0,
        postOut: postItem ? postItem.qtyConsumed : 0,
      };
    });
    setEditFormData(formData);
    setEditingReport(report);
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;
    setIsSubmitting(true);
    try {
      if (editingReport.preCheckIn) {
        const newPreConsumed = PREDEFINED_ITEMS.map(item => ({
          ...item,
          qtyConsumed: editFormData[item.name]?.initial || 0,
          price: item.defaultPrice
        })).filter(i => i.qtyConsumed > 0);
        const updatedPre = { ...editingReport.preCheckIn, minibarConsumed: newPreConsumed };
        updatedPre.totalMinibar = newPreConsumed.reduce((acc, curr) => acc + (curr.qtyConsumed * curr.price), 0);
        await saveRecord('pre_checkin', editingReport.bookingId, updatedPre);
      }

      if (editingReport.postCheckOut) {
        const newPostConsumed = PREDEFINED_ITEMS.map(item => ({
          ...item,
          qtyConsumed: editFormData[item.name]?.postOut || 0,
          price: item.defaultPrice
        })).filter(i => i.qtyConsumed > 0);
        const updatedPost = { ...editingReport.postCheckOut, minibarConsumed: newPostConsumed };
        updatedPost.totalMinibar = newPostConsumed.reduce((acc, curr) => acc + (curr.qtyConsumed * curr.price), 0);
        await saveRecord('post_checkout', editingReport.bookingId, updatedPost);
      }

      await fetchTrackingReports();
      setEditingReport(null);
    } catch (error) {
      console.error("Failed to update report", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchTrackingReports = async () => {"""
content = content.replace(func_anchor, new_funcs)

# 4. Add Edit button to table row
old_td = """                        <td className="px-4 py-4 align-top">
                          <span className="text-sm font-bold text-slate-900 block">{report.guestName || 'Unknown Guest'}</span>
                          <span className="text-xs text-slate-500 block mb-2">{report.complexName} - {report.unitName}</span>
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ID: {report.bookingId}</div>
                        </td>"""
new_td = """                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-sm font-bold text-slate-900 block">{report.guestName || 'Unknown Guest'}</span>
                              <span className="text-xs text-slate-500 block mb-2">{report.complexName} - {report.unitName}</span>
                              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ID: {report.bookingId}</div>
                            </div>
                            {currentUser?.role === 'admin' && (
                              <button 
                                onClick={() => handleEditReport(report)} 
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors ml-2" 
                                title="Edit Record"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>"""
content = content.replace(old_td, new_td)

# 5. Append Edit Modal
modal_anchor = "      {/* Tracking / Bridge Tab */}"
# Actually let's put it right before the last closing div of the component
modal_code = """
      {editingReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900">Admin Edit: Minibar Record</h3>
                <div className="text-xs text-slate-500">{editingReport.guestName} ({editingReport.bookingId})</div>
              </div>
              <button onClick={() => setEditingReport(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500 sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-bold">Item</th>
                    <th className="px-4 py-3 font-bold text-center">Initial Stock<br/><span className="text-[10px] font-normal">(Pre-CheckIn)</span></th>
                    <th className="px-4 py-3 font-bold text-center">Checkout Cons.<br/><span className="text-[10px] font-normal">(Post-CheckOut)</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PREDEFINED_ITEMS.map(item => (
                    <tr key={item.name} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-700 text-xs">{item.name}</td>
                      <td className="px-4 py-2 text-center">
                         <input 
                           type="number" 
                           min="0"
                           className="w-14 p-1.5 text-center border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={editFormData[item.name]?.initial ?? ''}
                           onChange={(e) => setEditFormData(prev => ({...prev, [item.name]: { ...prev[item.name], initial: parseInt(e.target.value) || 0 }}))}
                           disabled={!editingReport.preCheckIn}
                           title={!editingReport.preCheckIn ? "No Pre-Check-In record exists" : ""}
                         />
                      </td>
                      <td className="px-4 py-2 text-center">
                         <input 
                           type="number" 
                           min="0"
                           className="w-14 p-1.5 text-center border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={editFormData[item.name]?.postOut ?? ''}
                           onChange={(e) => setEditFormData(prev => ({...prev, [item.name]: { ...prev[item.name], postOut: parseInt(e.target.value) || 0 }}))}
                           disabled={!editingReport.postCheckOut}
                           title={!editingReport.postCheckOut ? "No Post-Check-Out record exists" : ""}
                         />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setEditingReport(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Save Adjustments</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};"""

last_div = "    </div>\n  );\n};"
content = content.replace(last_div, modal_code)

with open('src/components/MinibarDashboard.tsx', 'w') as f:
    f.write(content)
print("Admin edit patched.")
