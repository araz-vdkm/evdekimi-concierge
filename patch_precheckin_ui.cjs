const fs = require('fs');
let code = fs.readFileSync('src/components/PreCheckInFlow.tsx', 'utf8');

const minibarUI = `
      {step === STEPS_CONFIG.length && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-4">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Minibar Initial Inventory</h2>
            <p className="text-sm text-slate-500">
              Open the minibar fridge, snack display tray, and/or wine cabinet. 
              Upload 1 clear photo of the minibar interior and snack tray showing the current state of stock before check-in.
            </p>
          </div>
          
          <div className="flex gap-2 w-full mb-6">
            <button 
              onClick={() => setActiveMinibarCamera(true)}
              className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors shadow-sm whitespace-nowrap flex-1"
            >
              <Camera className="w-4 h-4" /> Take Photo
            </button>
            <label className="inline-flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm cursor-pointer transition-colors shadow-sm whitespace-nowrap flex-1">
              <Upload className="w-4 h-4" /> Upload Photo
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={handleMinibarPhotoAdd}
                className="hidden"
              />
            </label>
          </div>
          
          {minibarPhoto && (
            <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 mb-6 max-w-sm group">
              <img src={minibarPhoto} alt="Minibar" className="w-full h-full object-cover" />
              <button
                onClick={() => setMinibarPhoto(null)}
                className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Record Missing Items Before Check-in</h3>
          <div className="space-y-1">
            <div className="flex font-bold text-xs uppercase text-slate-500 pb-2 px-2">
              <div className="flex-1">Item</div>
              <div className="w-24 text-right">Price (IDR)</div>
              <div className="w-24 text-center">Missing Qty</div>
            </div>
            {MINIBAR_ITEMS.map(item => (
              <div key={item.name} className="flex items-center p-2 hover:bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.location}</div>
                </div>
                <div className="w-24 text-right text-sm text-slate-600">
                  {item.price.toLocaleString('id-ID')}
                </div>
                <div className="w-24 flex justify-center">
                  <input 
                    type="number" 
                    min="0"
                    className="w-16 p-1 text-center border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={minibarConsumed[item.name] || ''}
                    onChange={(e) => { 
                      const val = parseInt(e.target.value) || 0; 
                      setMinibarConsumed(prev => ({...prev, [item.name]: val}));
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-200 font-bold text-slate-900">
              <span>Total Missing Value:</span>
              <span className="text-lg">
                Rp {MINIBAR_ITEMS.reduce((acc, curr) => acc + ((minibarConsumed[curr.name] || 0) * curr.price), 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  "{step === STEPS_CONFIG.length && (",
  minibarUI + "\n      {step === STEPS_CONFIG.length + 1 && ("
);

// We also need to add activeMinibarCamera block
const minibarCameraBlock = `
  if (activeMinibarCamera) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "environment" }}
          className="flex-1 object-cover"
        />
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center">
          <button onClick={() => setActiveMinibarCamera(false)} className="px-4 py-2 bg-slate-800 text-white rounded-full font-bold">Cancel</button>
          <button 
            onClick={() => {
              const imageSrc = webcamRef.current?.getScreenshot();
              if (imageSrc) setMinibarPhoto(imageSrc);
              setActiveMinibarCamera(false);
            }} 
            className="w-16 h-16 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center shadow-lg"
          >
            <div className="w-12 h-12 bg-white rounded-full border border-slate-200"></div>
          </button>
          <div className="w-16"></div>
        </div>
      </div>
    );
  }
`;

code = code.replace(
  "if (activeMaintenanceCamera) {",
  minibarCameraBlock + "\n  if (activeMaintenanceCamera) {"
);

// Format submission logic
const submitLogic = `
      const consumedList = MINIBAR_ITEMS.map(item => ({
        name: item.name,
        location: item.location,
        price: item.price,
        qtyConsumed: minibarConsumed[item.name] || 0
      })).filter(i => i.qtyConsumed > 0);

      const report = {
        type: 'pre_checkin',
        bookingId: initialBooking?.id || '',
        guestName: initialBooking?.guestName || initialBooking?.guest?.name || 'Unknown',
        complexName: initialBooking?.complexName || initialBooking?.villa || 'Unknown',
        unitName: initialBooking?.unitName || 'Unknown',
        timestamp: new Date().toISOString(),
        data: photos,
        maintenanceNeeded,
        maintenanceNotes,
        maintenancePhotos: maintenancePhotos,
        minibarPhoto,
        minibarConsumed: consumedList,
        signature,
        submittedBy: currentUser?.username || 'Concierge'
      };
`;

code = code.replace(
  /const report = \{\s*type: 'pre_checkin',[\s\S]*?submittedBy: currentUser\?\.username \|\| 'Concierge'\s*\};/,
  submitLogic
);

// Image uploading logic
const uploadLogic = `
      let processedMaintenance: string[] = [];
      let processedMinibarPhoto = minibarPhoto;

      if (maintenanceNeeded && maintenancePhotos.length > 0) {
        processedMaintenance = await Promise.all(maintenancePhotos.map(async (p, idx) => {
          const comp = await compressImage(p, 1200, 1200, 0.85);
          return await uploadImageToStorage(comp, \`reports/pre_checkin/\${bookingId}/maintenance_\${idx}_\${Date.now()}.jpg\`);
        }));
      }

      if (report.minibarPhoto) {
        const compMini = await compressImage(report.minibarPhoto, 1200, 1200, 0.85);
        processedMinibarPhoto = await uploadImageToStorage(compMini, \`reports/pre_checkin/\${bookingId}/minibar.jpg\`);
      }

      const finalReport = {
        ...report,
        data: processedPhotos,
        maintenancePhotos: processedMaintenance,
        minibarPhoto: processedMinibarPhoto
      };
`;

code = code.replace(
  /let processedMaintenance: string\[\] = \[\];[\s\S]*?const finalReport = \{\s*\.\.\.report,\s*data: processedPhotos,\s*maintenancePhotos: processedMaintenance\s*\};/,
  uploadLogic
);

fs.writeFileSync('src/components/PreCheckInFlow.tsx', code);
console.log("PreCheckInFlow UI patched");
