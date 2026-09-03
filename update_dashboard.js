const fs = require("fs");
let code = fs.readFileSync("src/components/Dashboard.tsx", "utf8");

// 1. Add MINIBAR_ITEMS and helpers
const helpers = `
const MINIBAR_ITEMS = [
  { name: "Organique Water", location: "Fridge", price: 35000 },
  { name: "Pocari Sweat", location: "Fridge", price: 25000 },
  { name: "Soda Water", location: "Fridge", price: 25000 },
  { name: "Buavita Juice", location: "Fridge", price: 25000 },
  { name: "Coca-Cola", location: "Fridge", price: 25000 },
  { name: "Coca-Cola Zero", location: "Fridge", price: 25000 },
  { name: "UC 1000 Vitamin C", location: "Fridge", price: 30000 },
  { name: "Redbull", location: "Fridge", price: 50000 },
  { name: "Snickers", location: "Fridge", price: 30000 },
  { name: "Oatside Oatmilk", location: "Fridge", price: 20000 },
  { name: "Bintang", location: "Fridge", price: 50000 },
  { name: "Bali Hai", location: "Fridge", price: 50000 },
  { name: "Kura Kura Hazy", location: "Fridge", price: 90000 },
  { name: "Kura Kura Ale", location: "Fridge", price: 90000 },
  { name: "Pringless", location: "Shelf", price: 35000 },
  { name: "Roasted Peanut", location: "Shelf", price: 25000 },
  { name: "Granobar", location: "Shelf", price: 25000 },
  { name: "Oatside Cereal Bar", location: "Shelf", price: 25000 },
  { name: "Roasted Almond", location: "Shelf", price: 30000 },
  { name: "Salted Pistachio", location: "Shelf", price: 35000 },
  { name: "Healthy Protein Bar", location: "Shelf", price: 70000 },
  { name: "Mie Sedap Cup Noodle", location: "Shelf", price: 35000 },
];

const getMinibarList = (report: any) => {
  if (!report) return [];
  if (Array.isArray(report.minibarConsumed)) {
    return report.minibarConsumed;
  }
  if (report.minibarConsumed && typeof report.minibarConsumed === "object") {
    return Object.entries(report.minibarConsumed)
      .map(([name, qty]) => {
        const itemObj = MINIBAR_ITEMS.find((m: any) => m.name === name) || { name, price: 0, location: "Minibar" };
        return {
          name,
          location: itemObj.location,
          price: itemObj.price,
          qtyConsumed: Number(qty) || 0
        };
      })
      .filter(i => i.qtyConsumed > 0);
  }
  return [];
};

const getMinibarTotal = (report: any) => {
  if (report?.totalMinibar !== undefined) return report.totalMinibar;
  const list = getMinibarList(report);
  return list.reduce((acc: number, curr: any) => acc + ((curr.qtyConsumed || 0) * (curr.price || 0)), 0);
};
`;

if (!code.includes("const MINIBAR_ITEMS = [")) {
  code = code.replace("const COLORS = [", helpers + "\nconst COLORS = [");
}

// 2. Fix XLSX export for pre check in
code = code.replace(
  /'Minibar Missing Value \(IDR\)': r\.minibarConsumed \? r\.minibarConsumed\.reduce\(\(acc, curr\) => acc \+ \(curr\.qtyConsumed \* curr\.price\), 0\) : 0,/g,
  "'Minibar Stock Value (IDR)': getMinibarTotal(r),"
);

// 3. Minibar summary section in Pre-Check-In list view
const oldPreListSummary = `<div className="grid grid-cols-1 gap-3 text-sm mt-3">`;
const newPreListSummary = `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-3">
                    {(report.totalMinibar !== undefined || report.minibarConsumed || report.minibarPhoto) && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                          <Coffee className="w-4 h-4 text-emerald-600" /> Minibar Stock Value
                        </span>
                        <span className="font-bold text-emerald-700">
                          Rp {getMinibarTotal(report).toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}`;

if (code.includes(oldPreListSummary)) {
  code = code.replace(oldPreListSummary, newPreListSummary);
}

// 4. Replace selectedReportModal minibar section block
const targetComment = "{/* Minibar Section (Post Checkout) */}";
const targetCommentNew = "{/* Minibar Section (Pre-Check-In & Post-Check-Out) */}";

const minibarModalJSX = `{/* Minibar Section (Pre-Check-In & Post-Check-Out) */}
              {(selectedReportModal.minibarConsumed || selectedReportModal.minibarPhoto || selectedReportModal.totalMinibar !== undefined) && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-emerald-600" />
                      {selectedReportModal.type === 'pre_checkin' ? 'Minibar Stock & Inventory Status' : 'Minibar Inventory & Consumption'}
                    </span>
                    <span className="text-indigo-700 font-extrabold text-sm">
                      Total: Rp {getMinibarTotal(selectedReportModal).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="p-4">
                    {getMinibarList(selectedReportModal).length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No minibar items logged/consumed in this report.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs">
                        <div className="grid grid-cols-12 font-bold text-slate-400 uppercase tracking-wider pb-2">
                          <span className="col-span-6">Item Name</span>
                          <span className="col-span-2 text-center">Qty</span>
                          <span className="col-span-2 text-right">Price</span>
                          <span className="col-span-2 text-right">Total</span>
                        </div>
                        {getMinibarList(selectedReportModal).map((item: any, i: number) => (
                          <div key={i} className="grid grid-cols-12 py-2 items-center text-slate-800">
                            <div className="col-span-6 font-medium">
                              {item.name} {item.location && <span className="text-slate-400 text-[10px]">({item.location})</span>}
                            </div>
                            <div className="col-span-2 text-center font-bold text-slate-700">{item.qtyConsumed}x</div>
                            <div className="col-span-2 text-right text-slate-500">Rp {(item.price || 0).toLocaleString('id-ID')}</div>
                            <div className="col-span-2 text-right font-bold text-slate-900">
                              Rp {((item.qtyConsumed || 0) * (item.price || 0)).toLocaleString('id-ID')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedReportModal.minibarPhoto && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Minibar Verification Photo</span>
                        <img 
                          src={selectedReportModal.minibarPhoto} 
                          alt="Minibar Photo" 
                          className="h-32 rounded-lg border border-slate-200 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setLightboxImage(selectedReportModal.minibarPhoto)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}`;

// Locate minibar section start and end in selectedReportModal
const startIdx = code.indexOf(targetComment);
if (startIdx !== -1) {
  const endMarker = "{/* Nested Inspection Data Sections & Photos */}";
  const endIdx = code.indexOf(endMarker, startIdx);
  if (endIdx !== -1) {
    code = code.slice(0, startIdx) + minibarModalJSX + "\n\n              " + code.slice(endIdx);
  }
}

fs.writeFileSync("src/components/Dashboard.tsx", code);
console.log("Successfully updated Dashboard.tsx!");
