const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const oldTableStr = `          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-white border-b border-slate-200">
                  <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4 font-semibold w-16">Profile</th>
                    <th className="px-6 py-4 font-semibold">Guest Information</th>
                    <th className="px-6 py-4 font-semibold">Accommodation</th>
                    <th className="px-6 py-4 font-semibold">Stay Dates</th>
                    <th className="px-6 py-4 font-semibold">Contact Info</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {groupedGuests.map((group, idx) => {
                    const master = group.master;
                    if (!master) return null;
                    return (
                      <React.Fragment key={master.id || idx}>
                        <tr onClick={() => setSelectedGuestModal(master)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                          <td className="px-6 py-4">
                            {master.photo ? (
                              <img src={\`data:image/jpeg;base64,\${master.photo}\`} alt="Guest" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-sm font-bold">
                                {master.fullName?.charAt(0) || '?'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 text-base mb-0.5">{master.fullName || 'Unknown Guest'}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 font-bold">
                                Master
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {master.nationality || 'N/A'}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono">{master.passportNumber}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">DOB: {master.dob} (Age: {master.calculatedAge})</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800 mb-0.5">{master.unitName || '—'}</div>
                            <div className="text-xs text-slate-500">{master.complexName}</div>
                            {master.guestsCount && <div className="text-xs text-slate-400 mt-1">{master.guestsCount} guest(s) total</div>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-1 text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="font-medium text-xs">{master.checkInDate || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                              <Clock className="w-3.5 h-3.5 text-rose-400" />
                              <span className="text-xs">{master.checkOutDate || '—'}</span>
                            </div>
                            <div className="text-xs text-slate-400">{master.durationOfStay}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-800 mb-1">{master.contactNumber || '—'}</div>
                            <div className="text-xs text-slate-500">{master.contactEmail || '—'}</div>
                          </td>
                        </tr>
                        {group.aliases.map((alias: any) => (
                          <tr key={alias.id} onClick={() => setSelectedGuestModal(alias)} className="hover:bg-slate-100 transition-colors cursor-pointer bg-slate-50/50 group">
                            <td className="px-6 py-3 pl-10 flex items-center gap-3">
                              <CornerDownRight className="w-4 h-4 text-slate-300 shrink-0" />
                              {alias.photo ? (
                                <img src={\`data:image/jpeg;base64,\${alias.photo}\`} alt="Alias" className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 shadow-sm flex items-center justify-center text-slate-500 text-sm font-bold">
                                  {alias.fullName?.charAt(0) || '?'}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <div className="font-bold text-slate-700 text-sm mb-0.5">{alias.fullName || 'Unknown Guest'}</div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                                <span className="flex items-center gap-1 text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300">
                                  Alias
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {alias.nationality || 'N/A'}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono">{alias.passportNumber}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-slate-500 text-sm">
                              {/* Inherited unit */}
                              <span className="italic text-xs text-slate-400">Accompanied</span>
                            </td>
                            <td className="px-6 py-3">
                               <div className="text-xs text-slate-400 mt-1">DOB: {alias.dob} (Age: {alias.calculatedAge})</div>
                            </td>
                            <td className="px-6 py-3 text-slate-500 text-sm">
                              <div className="text-sm font-medium text-slate-700 mb-1">{alias.contactNumber || '—'}</div>
                              <div className="text-xs text-slate-500">{alias.contactEmail || '—'}</div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}`;

const newTableStr = `          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white border-b border-slate-200">
                    <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="px-6 py-4 font-semibold w-16">Profile</th>
                      <th className="px-6 py-4 font-semibold">Guest Information</th>
                      <th className="px-6 py-4 font-semibold">Accommodation</th>
                      <th className="px-6 py-4 font-semibold">Stay Dates</th>
                      <th className="px-6 py-4 font-semibold">Contact Info</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {groupedGuests.map((group, idx) => {
                      const master = group.master;
                      if (!master) return null;
                      return (
                        <React.Fragment key={master.id || idx}>
                          <tr onClick={() => setSelectedGuestModal(master)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                            <td className="px-6 py-4">
                              {master.photo ? (
                                <img src={\`data:image/jpeg;base64,\${master.photo}\`} alt="Guest" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-sm font-bold">
                                  {master.fullName?.charAt(0) || '?'}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900 text-base mb-0.5">{master.fullName || 'Unknown Guest'}</div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                                <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 font-bold">
                                  Master
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {master.nationality || 'N/A'}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono">{master.passportNumber}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1">DOB: {master.dob} (Age: {master.calculatedAge})</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-800 mb-0.5">{master.unitName || '—'}</div>
                              <div className="text-xs text-slate-500">{master.complexName}</div>
                              {master.guestsCount && <div className="text-xs text-slate-400 mt-1">{master.guestsCount} guest(s) total</div>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 mb-1 text-slate-700">
                                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="font-medium text-xs">{master.checkInDate || '—'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Clock className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-xs">{master.checkOutDate || '—'}</span>
                              </div>
                              <div className="text-xs text-slate-400">{master.durationOfStay}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-slate-800 mb-1">{master.contactNumber || '—'}</div>
                              <div className="text-xs text-slate-500">{master.contactEmail || '—'}</div>
                            </td>
                          </tr>
                          {group.aliases.map((alias: any) => (
                            <tr key={alias.id} onClick={() => setSelectedGuestModal(alias)} className="hover:bg-slate-100 transition-colors cursor-pointer bg-slate-50/50 group">
                              <td className="px-6 py-3 pl-10 flex items-center gap-3">
                                <CornerDownRight className="w-4 h-4 text-slate-300 shrink-0" />
                                {alias.photo ? (
                                  <img src={\`data:image/jpeg;base64,\${alias.photo}\`} alt="Alias" className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 shadow-sm flex items-center justify-center text-slate-500 text-sm font-bold">
                                    {alias.fullName?.charAt(0) || '?'}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                <div className="font-bold text-slate-700 text-sm mb-0.5">{alias.fullName || 'Unknown Guest'}</div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                                  <span className="flex items-center gap-1 text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300">
                                    Alias
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {alias.nationality || 'N/A'}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono">{alias.passportNumber}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-slate-500 text-sm">
                                <span className="italic text-xs text-slate-400">Accompanied</span>
                              </td>
                              <td className="px-6 py-3">
                                 <div className="text-xs text-slate-400 mt-1">DOB: {alias.dob} (Age: {alias.calculatedAge})</div>
                              </td>
                              <td className="px-6 py-3 text-slate-500 text-sm">
                                <div className="text-sm font-medium text-slate-700 mb-1">{alias.contactNumber || '—'}</div>
                                <div className="text-xs text-slate-500">{alias.contactEmail || '—'}</div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block lg:hidden flex-col divide-y divide-slate-100">
                {groupedGuests.map((group, idx) => {
                  const master = group.master;
                  if (!master) return null;
                  return (
                    <div key={master.id || idx} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex gap-4 cursor-pointer" onClick={() => setSelectedGuestModal(master)}>
                        <div className="shrink-0">
                          {master.photo ? (
                            <img src={\`data:image/jpeg;base64,\${master.photo}\`} alt="Guest" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-base font-bold">
                              {master.fullName?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-slate-900 truncate pr-2 text-base">{master.fullName || 'Unknown Guest'}</h3>
                            <span className="shrink-0 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 font-bold text-[10px] uppercase">
                              Master
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium mb-2">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {master.nationality || 'N/A'}</span>
                            <span className="text-slate-300 hidden sm:inline">•</span>
                            <span className="font-mono bg-slate-100 px-1.5 rounded">{master.passportNumber}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-3 bg-white p-2.5 rounded-lg border border-slate-100">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Accommodation</div>
                              <div className="text-sm font-medium text-slate-800">{master.unitName || '—'}</div>
                              <div className="text-xs text-slate-500 truncate">{master.complexName}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Dates</div>
                              <div className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {master.checkInDate || '—'}
                              </div>
                              <div className="text-xs font-medium text-rose-500 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" /> {master.checkOutDate || '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Aliases for Mobile */}
                      {group.aliases.length > 0 && (
                        <div className="mt-3 pl-8 space-y-2 relative before:absolute before:left-6 before:top-2 before:bottom-4 before:w-px before:bg-slate-200">
                          {group.aliases.map((alias: any) => (
                            <div key={alias.id} className="flex gap-3 relative bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 cursor-pointer" onClick={() => setSelectedGuestModal(alias)}>
                              <div className="absolute -left-[9px] top-4 w-4 h-px bg-slate-200"></div>
                              <div className="shrink-0">
                                {alias.photo ? (
                                  <img src={\`data:image/jpeg;base64,\${alias.photo}\`} alt="Alias" className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 shadow-sm flex items-center justify-center text-slate-500 text-xs font-bold">
                                    {alias.fullName?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                  <h4 className="font-semibold text-slate-700 text-sm truncate pr-2">{alias.fullName || 'Unknown'}</h4>
                                  <span className="shrink-0 text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded font-medium text-[10px]">
                                    Alias
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span>{alias.nationality || 'N/A'}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono">{alias.passportNumber}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}`;

if (code.includes(oldTableStr)) {
    code = code.replace(oldTableStr, newTableStr);
    fs.writeFileSync('src/components/Dashboard.tsx', code);
    console.log("Successfully patched Dashboard table");
} else {
    console.error("String mismatch, could not patch");
}
