const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

code = code.replace(
  '<span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{g.status}</span>',
  `<span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{g.status}</span>
                                      {g.loyaltyStatus && g.loyaltyStatus !== 'None' && (
                                        <span className={\`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider \${
                                          g.loyaltyStatus === 'Gold' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                          g.loyaltyStatus === 'Silver' ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                                          'bg-orange-100 text-orange-800 border border-orange-300'
                                        }\`}>
                                          {g.loyaltyStatus}
                                        </span>
                                      )}`
);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("Dashboard UI patched for loyalty");
