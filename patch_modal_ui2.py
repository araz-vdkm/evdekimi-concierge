import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

start_str = "              <table className=\"w-full text-left text-sm\">"
end_str = "              </table>"

idx_start = content.rfind(start_str)
idx_end = content.find(end_str, idx_start)

if idx_start != -1 and idx_end != -1:
    new_table = """              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold bg-slate-100 sticky left-0 z-20">Item</th>
                    <th className="px-4 py-3 font-bold text-center whitespace-nowrap bg-slate-100">Initial Stock<br/><span className="text-[9px] font-normal">(Pre-CheckIn)</span></th>
                    <th className="px-4 py-3 font-bold text-center whitespace-nowrap bg-slate-100">Checkout Cons.<br/><span className="text-[9px] font-normal">(Post-CheckOut)</span></th>
                    {(editingReport.manualLogs || []).sort((a:any, b:any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((log:any, idx:number) => {
                      const d = new Date(log.createdAt || log.timestamp);
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const hh = String(d.getHours()).padStart(2, '0');
                      const mins = String(d.getMinutes()).padStart(2, '0');
                      return (
                        <th key={log.id} className="px-4 py-3 font-bold text-center whitespace-nowrap text-blue-600 bg-slate-100 border-l border-slate-200">
                          Manual Entry<br/><span className="text-[9px] font-normal">{dd}/{mm} {hh}:{mins}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PREDEFINED_ITEMS.map(item => (
                    <tr key={item.name} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-700 text-xs bg-white sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9]">{item.name}</td>
                      <td className="px-4 py-2 text-center bg-white">
                         <input 
                           type="number" 
                           min="0"
                           className="w-14 p-1.5 text-center border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={editFormData[item.name]?.initial ?? ''}
                           onChange={(e) => setEditFormData(prev => ({...prev, [item.name]: { ...prev[item.name], initial: parseInt(e.target.value) || 0 }}))}
                           title={!editingReport.preCheckIn ? "Will create Pre-Check-In record" : ""}
                         />
                      </td>
                      <td className="px-4 py-2 text-center bg-white">
                         <input 
                           type="number" 
                           min="0"
                           className="w-14 p-1.5 text-center border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={editFormData[item.name]?.postOut ?? ''}
                           onChange={(e) => setEditFormData(prev => ({...prev, [item.name]: { ...prev[item.name], postOut: parseInt(e.target.value) || 0 }}))}
                           title={!editingReport.postCheckOut ? "Will create Post-Check-Out record" : ""}
                         />
                      </td>
                      {(editingReport.manualLogs || []).sort((a:any, b:any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((log:any) => (
                        <td key={log.id} className="px-4 py-2 text-center bg-blue-50/30 border-l border-slate-200">
                           <input 
                             type="number" 
                             min="0"
                             className="w-14 p-1.5 text-center border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                             value={editFormData[item.name]?.manual?.[log.id] ?? ''}
                             onChange={(e) => setEditFormData(prev => ({
                               ...prev, 
                               [item.name]: { 
                                 ...prev[item.name], 
                                 manual: {
                                   ...(prev[item.name]?.manual || {}),
                                   [log.id]: parseInt(e.target.value) || 0
                                 }
                               }
                             }))}
                           />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>"""

    content = content[:idx_start] + new_table + content[idx_end + len(end_str):]
    with open('src/components/MinibarDashboard.tsx', 'w') as f:
        f.write(content)
    print("Modal UI updated successfully!")
else:
    print("Failed to find modal table block")
