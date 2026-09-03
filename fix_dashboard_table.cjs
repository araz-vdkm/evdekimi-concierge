const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// Replace table headers
content = content.replace(
  /<tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">[\s\S]*?<\/tr>/,
  `<tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4 font-semibold w-16">Profile</th>
                    <th className="px-6 py-4 font-semibold">Guest Information</th>
                    <th className="px-6 py-4 font-semibold">Accommodation</th>
                    <th className="px-6 py-4 font-semibold">Stay Dates</th>
                    <th className="px-6 py-4 font-semibold">Contact Info</th>
                  </tr>`
);

// Replace row content
const rowStartRegex = /<td className="px-6 py-4">\s*<div className="font-bold text-slate-900 text-base mb-0\.5">\{guest\.fullName \|\| 'Unknown Guest'\}<\/div>[\s\S]*?<\/td>\s*<\/tr>/;

const newRowContent = `<td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-base mb-0.5">{guest.fullName || 'Unknown Guest'}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                          <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            {(guest as any).aliasRole}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {guest.nationality || 'N/A'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono">{guest.passportNumber}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">DOB: {guest.dob} (Age: {(guest as any).calculatedAge})</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 mb-0.5">{guest.unitName || '—'}</div>
                        <div className="text-xs text-slate-500">{guest.complexName}</div>
                        {guest.guestsCount && <div className="text-xs text-slate-400 mt-1">{guest.guestsCount} guest(s) total</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-medium text-xs">{guest.checkInDate || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-xs">{guest.checkOutDate || '—'}</span>
                        </div>
                        <div className="text-xs text-slate-400">{(guest as any).durationOfStay}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800 mb-1">{guest.contactNumber || '—'}</div>
                        <div className="text-xs text-slate-500">{guest.contactEmail || '—'}</div>
                      </td>
                    </tr>`;

content = content.replace(rowStartRegex, newRowContent);
fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
