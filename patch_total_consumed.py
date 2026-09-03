import re

with open('src/components/MinibarDashboard.tsx', 'r') as f:
    content = f.read()

old_thead = """                                       <thead className="bg-slate-100 text-[10px] uppercase text-slate-500">
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
                                       </thead>"""

new_thead = """                                       <thead className="bg-slate-100 text-[10px] uppercase text-slate-500">
                                         <tr>
                                           <th className="px-2 py-1.5 font-bold">Item</th>
                                           <th className="px-2 py-1.5 font-bold text-center">Initial Stock</th>
                                           <th className="px-2 py-1.5 font-bold text-center whitespace-nowrap bg-slate-200">Total Cons.</th>
                                           <th className="px-2 py-1.5 font-bold text-center whitespace-nowrap">Post-Checkout</th>
                                           {sortedManualLogs.map((log:any, idx:number) => (
                                              <th key={idx} className="px-2 py-1.5 font-bold text-center text-blue-600 whitespace-nowrap">
                                                {formatManualDate(log.createdAt || log.timestamp)}
                                              </th>
                                           ))}
                                           <th className="px-2 py-1.5 font-bold text-right">Value (Rp)</th>
                                         </tr>
                                       </thead>"""

old_tbody = """                                       <tbody className="divide-y divide-slate-100">
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
                                       </tbody>"""

new_tbody = """                                       <tbody className="divide-y divide-slate-100">
                                         {bridgedItems.map((item, i) => (
                                           <tr key={i} className="hover:bg-slate-50">
                                             <td className="px-2 py-1.5 font-medium text-slate-700">{item.name}</td>
                                             <td className="px-2 py-1.5 text-center text-slate-600">{item.initial || '-'}</td>
                                             <td className="px-2 py-1.5 text-center text-rose-700 font-bold bg-rose-50/50">{item.totalConsumed > 0 ? `-${item.totalConsumed}` : '-'}</td>
                                             <td className="px-2 py-1.5 text-center text-slate-500 font-medium">{item.postOutConsumed > 0 ? `-${item.postOutConsumed}` : '-'}</td>
                                             {item.manualQuantities.map((q:number, idx:number) => (
                                                <td key={idx} className="px-2 py-1.5 text-center text-blue-600 font-medium">{q > 0 ? `-${q}` : '-'}</td>
                                             ))}
                                             <td className="px-2 py-1.5 text-right font-medium text-slate-900">{item.value > 0 ? item.value.toLocaleString('id-ID') : '-'}</td>
                                           </tr>
                                         ))}
                                       </tbody>"""

if old_thead in content and old_tbody in content:
    content = content.replace(old_thead, new_thead)
    content = content.replace(old_tbody, new_tbody)
    print("Patched successfully")
else:
    print("Could not find blocks")

with open('src/components/MinibarDashboard.tsx', 'w') as f:
    f.write(content)
