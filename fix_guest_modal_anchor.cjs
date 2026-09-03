const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const guestModal = `
      {/* Guest Detail Modal */}
      {selectedGuestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="px-6 py-4 text-white flex items-center justify-between shrink-0 bg-blue-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    {selectedGuestModal.fullName || 'Guest Details'}
                  </h3>
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                    {selectedGuestModal.isMaster ? 'Master Guest' : 'Alias Guest'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedGuestModal(null)} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col sm:flex-row gap-6">
              
              <div className="shrink-0 flex flex-col items-center">
                 {selectedGuestModal.photo ? (
                    <img src={\`data:image/jpeg;base64,\${selectedGuestModal.photo}\`} alt="Guest Photo" className="w-32 h-32 rounded-xl object-cover border-4 border-slate-100 shadow-sm mb-4" />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-blue-50 border-4 border-white shadow-sm flex items-center justify-center text-blue-300 mb-4">
                       <User className="w-12 h-12" />
                    </div>
                  )}
                  <span className={\`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full \${selectedGuestModal.status === 'Checked In' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}\`}>
                     {selectedGuestModal.status || 'Checked In'}
                  </span>
              </div>
              
              <div className="flex-1 space-y-6">
                 <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Identity Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Passport Number</p>
                        <p className="font-mono font-bold text-slate-900">{selectedGuestModal.passportNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Nationality</p>
                        <p className="font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400"/>{selectedGuestModal.nationality || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Date of Birth</p>
                        <p className="font-bold text-slate-900">{selectedGuestModal.dob || 'N/A'} <span className="text-slate-400 font-normal">({selectedGuestModal.calculatedAge || '?'} yrs)</span></p>
                      </div>
                    </div>
                 </div>
                 
                 <div className="h-px bg-slate-100 w-full" />
                 
                 <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Accommodation & Stay</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Villa / Unit</p>
                        <p className="font-bold text-slate-900">{selectedGuestModal.complexName} <span className="text-slate-400 font-normal ml-1">/ {selectedGuestModal.unitName}</span></p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Booking ID</p>
                        <p className="font-mono font-bold text-slate-900 text-xs mt-0.5">{selectedGuestModal.bookingId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Check-in</p>
                        <p className="font-bold text-slate-900">{selectedGuestModal.checkInDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Check-out</p>
                        <p className="font-bold text-slate-900">{selectedGuestModal.checkOutDate || 'N/A'}</p>
                      </div>
                    </div>
                 </div>

                 {(selectedGuestModal.contactNumber || selectedGuestModal.contactEmail) && (
                   <>
                     <div className="h-px bg-slate-100 w-full" />
                     
                     <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contact Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedGuestModal.contactNumber && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Phone Number</p>
                              <p className="font-bold text-slate-900">{selectedGuestModal.contactNumber}</p>
                            </div>
                          )}
                          {selectedGuestModal.contactEmail && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Email Address</p>
                              <p className="font-bold text-slate-900">{selectedGuestModal.contactEmail}</p>
                            </div>
                          )}
                        </div>
                     </div>
                   </>
                 )}
                 
                 {(selectedGuestModal.purpose || selectedGuestModal.upsell) && (
                   <>
                     <div className="h-px bg-slate-100 w-full" />
                     <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Additional Details</h4>
                        {selectedGuestModal.purpose && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-slate-500 mb-1">Purpose of Visit / Celebration</p>
                            <p className="text-sm text-slate-900 bg-slate-50 p-2 rounded-md border border-slate-100">{selectedGuestModal.purpose}</p>
                          </div>
                        )}
                        {selectedGuestModal.upsell && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Upsell Opportunities</p>
                            <p className="text-sm text-slate-900 bg-emerald-50 text-emerald-800 p-2 rounded-md border border-emerald-100">{selectedGuestModal.upsell}</p>
                          </div>
                        )}
                     </div>
                   </>
                 )}
                 
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedGuestModal(null)} 
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
            
          </div>
        </div>
      )}
`;

content = content.replace(
  /\{selectedReportModal && \(/,
  guestModal + "\n      {selectedReportModal && ("
);

fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
console.log('Added Guest Detail Modal');
