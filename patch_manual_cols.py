import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

# Using regex to replace the IIFE block precisely.
# The block starts at `                          {(() => {` and ends at `                          })()}`.
import re

start_str = "                          {(() => {\n                             const itemNames = new Set<string>();"
end_str = "                             );\n                          })()}"

if start_str in content and end_str in content:
    idx_start = content.find(start_str)
    idx_end = content.find(end_str) + len(end_str)
    
    old_block = content[idx_start:idx_end]
    
    new_block = """                          {(() => {
                             const itemNames = new Set<string>();
                             report.preCheckIn?.minibarConsumed?.forEach((i:any) => itemNames.add(i.name));
                             report.postCheckOut?.minibarConsumed?.forEach((i:any) => itemNames.add(i.name));
                             
                             const sortedManualLogs = [...(report.manualLogs || [])].sort((a: any, b: any) => 
                               new Date(a.createdAt || a.timestamp).getTime() - new Date(b.createdAt || b.timestamp).getTime()
                             );
                             
                             sortedManualLogs.forEach((log:any) => log.items?.forEach((i:any) => itemNames.add(i.name)));
                             
                             const formatManualDate = (dateStr: string) => {
                               if (!dateStr) return "MANUAL";
                               const d = new Date(dateStr);
                               if (isNaN(d.getTime())) return "MANUAL";
                               const dd = String(d.getDate()).padStart(2, '0');
                               const mm = String(d.getMonth() + 1).padStart(2, '0');
                               const yy = String(d.getFullYear()).slice(-2);
                               const hh = String(d.getHours()).padStart(2, '0');
                               const mins = String(d.getMinutes()).padStart(2, '0');
                               return `MANUAL ${dd}${mm}${yy} ${hh}:${mins}`;
                             };

                             const bridgedItems = Array.from(itemNames).map(name => {
                               const preItem = report.preCheckIn?.minibarConsumed?.find((i:any) => i.name === name);
                               const postItem = report.postCheckOut?.minibarConsumed?.find((i:any) => i.name === name);
                               
                               const manualQuantities = sortedManualLogs.map((log:any) => {
                                 const mItem = log.items?.find((i:any) => i.name === name);
                                 return mItem ? mItem.quantity : 0;
                               });

                               let manualPrice = 0;
                               sortedManualLogs.forEach((log:any) => {
                                 const mItem = log.items?.find((i:any) => i.name === name);
                                 if (mItem) manualPrice = mItem.price;
                               });

                               const price = preItem?.price || postItem?.price || manualPrice || 0;
                               const initial = preItem?.qtyConsumed || 0;
                               const postOutConsumed = postItem?.qtyConsumed || 0;
                               const totalConsumed = postOutConsumed + manualQuantities.reduce((a,b) => a+b, 0);
                               
                               return { name, initial, postOutConsumed, manualQuantities, totalConsumed, price, value: totalConsumed * price };
                             });

                             return (
                               <div className="flex flex-col gap-3">
                                 <div className="flex gap-4 mb-2">
                                    <div className="flex-1 bg-white p-2 rounded border border-slate-200">
                                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Pre-Check-In Log</div>
                                      {report.preCheckIn ? (
                                        <div className="text-xs font-medium text-slate-700 flex items-center justify-between">
                                          <span>{new Date(report.preCheckIn.timestamp).toLocaleDateString()}</span>
                                          {report.preCheckIn.minibarPhoto && (
                                            <a href={report.preCheckIn.minibarPhoto} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                              <Camera className="w-3 h-3" /> Photo
                                            </a>
                                          )}
                                        </div>
                                      ) : <span className="text-xs text-amber-600">No Data</span>}
                                    </div>
                                    <div className="flex-1 bg-white p-2 rounded border border-slate-200">
                                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Post-Check-Out Log</div>
                                      {report.postCheckOut ? (
                                        <div className="text-xs font-medium text-slate-700 flex items-center justify-between">
                                          <span>{new Date(report.postCheckOut.timestamp).toLocaleDateString()}</span>
                                          {report.postCheckOut.minibarPhoto && (
                                            <a href={report.postCheckOut.minibarPhoto} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline flex items-center gap-1">
                                              <Camera className="w-3 h-3" /> Photo
                                            </a>
                                          )}
                                        </div>
                                      ) : <span className="text-xs text-slate-400">Pending</span>}
                                    </div>
                                 </div>
                                 
                                 {bridgedItems.length > 0 ? (
                                   <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                     <table className="w-full text-left text-xs">
                                       <thead className="bg-slate-100 text-[10px] uppercase text-slate-500">
                                         <tr>
                                           <th className="px-2 py-1.5 font-bold">Item</th>
                                           <th className="px-2 py-1.5 font-bold text-center">Initial Stock</th>
                                           <th className="px-2 py-1.5 font-bold text-center whitespace-nowrap">Post-Checkout Cons.</th>
                                           {sortedManualLogs.map((log:any, idx:number) => (
                                              <th key={idx} className="px-2 py-1.5 font-bold text-center text-blue-600 whitespace-nowrap">
                                                {formatManualDate(log.createdAt || log.timestamp)}
                                              </th>
                                           ))}
                                           <th className="px-2 py-1.5 font-bold text-right">Value (Rp)</th>
                                         </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                         {bridgedItems.map((item, i) => (
                                           <tr key={i} className="hover:bg-slate-50">
                                             <td className="px-2 py-1.5 font-medium text-slate-700">{item.name}</td>
                                             <td className="px-2 py-1.5 text-center text-slate-600">{item.initial || '-'}</td>
                                             <td className="px-2 py-1.5 text-center text-rose-600 font-bold">{item.postOutConsumed > 0 ? `-${item.postOutConsumed}` : '-'}</td>
                                             {item.manualQuantities.map((q:number, idx:number) => (
                                                <td key={idx} className="px-2 py-1.5 text-center text-blue-600 font-bold">{q > 0 ? `-${q}` : '-'}</td>
                                             ))}
                                             <td className="px-2 py-1.5 text-right font-medium text-slate-900">{item.value > 0 ? item.value.toLocaleString('id-ID') : '-'}</td>
                                           </tr>
                                         ))}
                                       </tbody>
                                     </table>
                                   </div>
                                 ) : (
                                   <div className="text-xs text-slate-400 italic">No minibar items tracked for this booking.</div>
                                 )}
                               </div>
                             );
                          })()}"""

    content = content[:idx_start] + new_block + content[idx_end:]
    
    with open('src/components/MinibarDashboard.tsx', 'w') as f:
        f.write(content)
        
    print("Patch applied successfully.")
else:
    print("Could not find start/end block in MinibarDashboard.tsx.")

