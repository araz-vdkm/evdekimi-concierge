import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckSquare, CheckCircle2, ChevronRight, X, Home as HomeIcon, Droplets, BedDouble, Bath, Upload, Coffee, RefreshCcw, ChevronLeft } from 'lucide-react';
import { saveRecord } from '../lib/db';
import { logActivity } from '../lib/activityLog';
import { compressImage } from '../lib/utils';
import { uploadImageToStorage } from '../lib/storage';

interface PostCheckOutFlowProps {
  onComplete: () => void;
  initialBooking?: any;
  currentUser?: any;
}

const STEPS_CONFIG = [
  {
    id: 'indoor',
    title: 'Indoor Living & Furniture',
    icon: HomeIcon,
    items: [
      { id: 'furniture', label: 'Furniture & Decor', desc: 'Check tables, chairs, doors, TV screens, and decor for cracks, dents, or deep gouges.', photoReq: '1 photo', reqCount: 1 },
      { id: 'walls', label: 'Walls & Glass', desc: 'Inspect walls for major scuffs or hole punctures, and check glass doors or windows for cracks.', photoReq: '1 photo', reqCount: 1 },
      { id: 'soft', label: 'Soft Furnishings & Odor', desc: 'Inspect mattresses, sofas, curtains for bleach/wine spills. Check for ash/smoke odor.', photoReq: '1 photo', reqCount: 1 },
      { id: 'dining', label: 'Dining & Surfaces', desc: 'Inspect couch condition, dining space, and overall surface state.', photoReq: '1 photo', reqCount: 1 },
    ]
  },
  {
    id: 'amenities',
    title: 'Amenities & Tech',
    icon: BedDouble,
    items: [
      { id: 'extras', label: 'Amenities & Extras', desc: 'Confirm presence of luxury bathrobes, hair dryers, tablets, espresso machines, art.', photoReq: '1 photo', reqCount: 1 },
      { id: 'safe', label: 'Storage & Safe', desc: 'Inspect general room state, open drawers, and wardrobe safe (confirm it is left open and empty).', photoReq: '1 photo', reqCount: 1 },
      { id: 'remotes', label: 'Remotes', desc: 'Inspect TV, AC remote controls are in place.', photoReq: '1 photo', reqCount: 1 },
    ]
  },
  {
    id: 'bathroom_outdoor',
    title: 'Bathroom & Outdoor',
    icon: Droplets,
    items: [
      { id: 'bathroom', label: 'Bathroom Fixtures', desc: 'Check bathroom fixtures for water leaks, overflow risks, or fixture damage.', photoReq: '1 photo', reqCount: 1 },
      { id: 'pool', label: 'Pool & Sunbeds', desc: 'Check water clarity, foreign items in pool. Check sunbeds and umbrella for damage.', photoReq: '1 photo', reqCount: 1 },
      { id: 'pathways', label: 'Outdoor Pathways', desc: 'Inspect outdoor pathways and plant beds for trash, damaged lighting, or broken furniture.', photoReq: '1 photo', reqCount: 1 },
    ]
  },
];

const MINIBAR_ITEMS = [
  { name: 'Organique Water', location: 'Fridge', price: 35000, parQty: 2 },
  { name: 'Pocari Sweat', location: 'Fridge', price: 25000, parQty: 2 },
  { name: 'Soda Water', location: 'Fridge', price: 25000, parQty: 2 },
  { name: 'Buavita Juice', location: 'Fridge', price: 25000, parQty: 2 },
  { name: 'Coca-Cola', location: 'Fridge', price: 25000, parQty: 2 },
  { name: 'Coca-Cola Zero', location: 'Fridge', price: 25000, parQty: 2 },
  { name: 'UC 1000 Vitamin C', location: 'Fridge', price: 30000, parQty: 2 },
  { name: 'Redbull', location: 'Fridge', price: 50000, parQty: 2 },
  { name: 'Snickers', location: 'Fridge', price: 30000, parQty: 2 },
  { name: 'Oatside Oatmilk', location: 'Fridge', price: 20000, parQty: 2 },
  { name: 'Bintang', location: 'Fridge', price: 50000, parQty: 2 },
  { name: 'Bali Hai', location: 'Fridge', price: 50000, parQty: 2 },
  { name: 'Kura Kura Hazy', location: 'Fridge', price: 90000, parQty: 2 },
  { name: 'Kura Kura Ale', location: 'Fridge', price: 90000, parQty: 2 },
  { name: 'Pringless', location: 'Shelf', price: 35000, parQty: 1 },
  { name: 'Roasted Peanut', location: 'Shelf', price: 25000, parQty: 1 },
  { name: 'Granobar', location: 'Shelf', price: 25000, parQty: 1 },
  { name: 'Oatside Cereal Bar', location: 'Shelf', price: 25000, parQty: 1 },
  { name: 'Roasted Almond', location: 'Shelf', price: 30000, parQty: 1 },
  { name: 'Salted Pistachio', location: 'Shelf', price: 35000, parQty: 1 },
  { name: 'Healthy Protein Bar', location: 'Shelf', price: 70000, parQty: 1 },
  { name: 'Mie Sedap Cup Noodle', location: 'Shelf', price: 35000, parQty: 2 },
];

type SectionData = Record<string, { photos: string[] }>;

export default function PostCheckOutFlow({ onComplete, initialBooking, currentUser }: PostCheckOutFlowProps) {
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<Record<string, SectionData>>({
    indoor: {},
    amenities: {},
    bathroom_outdoor: {}
  });
  
  const [minibarPhoto, setMinibarPhoto] = useState<string | null>(null);
  const [minibarRemaining, setMinibarRemaining] = useState<Record<string, number>>({});

  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [signature, setSignature] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [activeCamera, setActiveCamera] = useState<{sectionId: string, itemId: string} | null>(null);
  const [activeMinibarCamera, setActiveMinibarCamera] = useState(false);
  const [preCheckInStock, setPreCheckInStock] = useState<Record<string, number> | null>(null);
  
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const fetchPreCheckInStock = async () => {
      try {
        if (!initialBooking) return;
        const bookingId = initialBooking.id || initialBooking.confirmationCode;
        if (!bookingId) return;

        // First check localStorage for immediate sync capability
        const localData = localStorage.getItem(`pre_checkin_${bookingId}`);
        if (localData && localData !== 'true') {
          const parsed = JSON.parse(localData);
          if (parsed.minibarStock && Array.isArray(parsed.minibarStock)) {
            const stockMap: Record<string, number> = {};
            parsed.minibarStock.forEach((item: any) => {
              if (item.name && item.qtyStock !== undefined) {
                stockMap[item.name] = item.qtyStock;
              }
            });
            setPreCheckInStock(stockMap);
            return;
          }
        }
        
        // If not in local, check firestore
        const { getRecord } = await import('../lib/db');
        const report = await getRecord('pre_checkin', bookingId);
        if (report && report.minibarStock && Array.isArray(report.minibarStock)) {
          const stockMap: Record<string, number> = {};
          report.minibarStock.forEach((item: any) => {
            if (item.name && item.qtyStock !== undefined) {
              stockMap[item.name] = item.qtyStock;
            }
          });
          setPreCheckInStock(stockMap);
        }
      } catch (e) {
        console.warn("Failed to fetch pre-checkin stock:", e);
      }
    };
    fetchPreCheckInStock();
  }, [initialBooking]);

  const capturePhoto = useCallback(() => {
    if (webcamRef.current && activeCamera) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setData(prev => {
          const itemData = prev[activeCamera.sectionId]?.[activeCamera.itemId] || { photos: [] };
          return {
            ...prev,
            [activeCamera.sectionId]: {
              ...prev[activeCamera.sectionId],
              [activeCamera.itemId]: {
                ...itemData,
                photos: [...itemData.photos, imageSrc]
              }
            }
          };
        });
        setActiveCamera(null);
      }
    } else if (webcamRef.current && activeMinibarCamera) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setMinibarPhoto(imageSrc);
        setActiveMinibarCamera(false);
      }
    }
  }, [webcamRef, activeCamera, activeMinibarCamera]);

  const handlePhotoAdd = async (sectionId: string, itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      newPhotos.push(dataUrl);
    }

    setData(prev => {
      const itemData = prev[sectionId]?.[itemId] || { photos: [] };
      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [itemId]: {
            ...itemData,
            photos: [...itemData.photos, ...newPhotos]
          }
        }
      };
    });
  };

  const handleMinibarPhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setMinibarPhoto(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!signature.trim()) return;
    setIsProcessing(true);

    try {
      let submitterName = currentUser?.username || currentUser?.name || currentUser?.email || 'Concierge Staff';
      if (!submitterName || submitterName === 'Concierge Staff') {
        try {
          const userStr = localStorage.getItem('conciergeUser');
          if (userStr) {
            const parsed = JSON.parse(userStr);
            submitterName = parsed.username || parsed.name || parsed.email || 'Concierge Staff';
          }
        } catch(e) {}
      }
      
      const consumedList = MINIBAR_ITEMS.map(item => {
        const checkInQty = preCheckInStock && preCheckInStock[item.name] !== undefined ? preCheckInStock[item.name] : item.parQty;
        const remaining = minibarRemaining[item.name] !== undefined ? minibarRemaining[item.name] : checkInQty;
        const qtyConsumed = Math.max(0, checkInQty - remaining);
        return {
          ...item,
          qtyConsumed
        };
      }).filter(i => i.qtyConsumed > 0);
      
      const totalMinibar = consumedList.reduce((acc, curr) => acc + (curr.qtyConsumed * curr.price), 0);

      const bookingId = initialBooking?.id || initialBooking?.confirmationCode || `post_checkout_${Date.now()}`;

      const report = {
        type: 'post_checkout',
        timestamp: new Date().toISOString(),
        submittedBy: submitterName,
        bookingId: bookingId,
        confirmationCode: initialBooking?.confirmationCode || initialBooking?.id || '',
        guestName: initialBooking?.guestName || initialBooking?.fullName || 'Unknown',
        unitName: initialBooking?.unitName || '',
        complexName: initialBooking?.complexName || initialBooking?.villa || '',
        checkInDate: initialBooking?.checkInDate || '',
        checkOutDate: initialBooking?.checkOutDate || '',
        data,
        minibarPhoto,
        minibarConsumed: consumedList,
        totalMinibar,
        maintenanceNeeded,
        maintenanceNotes,
        signature
      };
      
      // Process and upload photos to Firebase Storage
      const processedData: Record<string, Record<string, { photos: string[] }>> = {};
      const uploadTasks: Promise<void>[] = [];
      
      for (const [sectionId, itemsObj] of Object.entries(data)) {
        processedData[sectionId] = {};
        for (const [itemId, itemData] of Object.entries(itemsObj)) {
          processedData[sectionId][itemId] = { photos: [] };
          (itemData.photos || []).forEach((photo, idx) => {
             const task = (async () => {
                const compressed = await compressImage(photo, 1200, 1200, 0.85);
                const path = `reports/post_checkout/${bookingId}/${sectionId}_${itemId}_${idx}.jpg`;
                const url = await uploadImageToStorage(compressed, path);
                processedData[sectionId][itemId].photos[idx] = url;
             })();
             uploadTasks.push(task);
          });
        }
      }
      await Promise.all(uploadTasks);

      let processedSignature = null;
      if (report.signature) {
        const compSig = await compressImage(report.signature, 600, 300, 0.8);
        processedSignature = await uploadImageToStorage(compSig, `reports/post_checkout/${bookingId}/signature.jpg`);
      }
      
      let processedMinibarPhoto = null;
      if (report.minibarPhoto) {
        const compMini = await compressImage(report.minibarPhoto, 1200, 1200, 0.85);
        processedMinibarPhoto = await uploadImageToStorage(compMini, `reports/post_checkout/${bookingId}/minibar.jpg`);
      }
      
      const finalPayload = {
        ...report,
        bookingId: bookingId,
        confirmationCode: initialBooking?.confirmationCode || bookingId,
        guestName: initialBooking?.guestName || report.guestName || '',
        complexName: initialBooking?.complexName || initialBooking?.villa || '',
        unitName: initialBooking?.unitName || '',
        checkInDate: initialBooking?.checkInDate || '',
        checkOutDate: initialBooking?.checkOutDate || '',
        data: processedData,
        signature: processedSignature,
        minibarPhoto: processedMinibarPhoto,
        lastEditedAt: new Date().toISOString()
      };

      await saveRecord('post_checkout', bookingId, finalPayload);
      if (initialBooking?.confirmationCode && initialBooking.confirmationCode !== bookingId) {
        await saveRecord('post_checkout', initialBooking.confirmationCode, finalPayload);
      }
      if (initialBooking?.id && initialBooking.id !== bookingId && initialBooking.id !== initialBooking.confirmationCode) {
        await saveRecord('post_checkout', initialBooking.id, finalPayload);
      }
      if (initialBooking?.guestName) {
        await saveRecord('post_checkout', `name_${initialBooking.guestName.toLowerCase().trim()}`, finalPayload);
      }
      if (initialBooking?.unitName && initialBooking?.checkOutDate) {
        await saveRecord('post_checkout', `unit_${initialBooking.unitName.toLowerCase().trim()}_${initialBooking.checkOutDate}`, finalPayload);
      }

      // Create minibar collection record if minibar items were consumed
      if (consumedList.length > 0 || totalMinibar > 0) {
        const minibarRecordId = `minibar_${bookingId}`;
        const minibarRecord = {
          id: minibarRecordId,
          bookingId: bookingId,
          confirmationCode: initialBooking?.confirmationCode || bookingId,
          guestName: initialBooking?.guestName || report.guestName || '',
          complexName: initialBooking?.complexName || initialBooking?.villa || '',
          unitName: initialBooking?.unitName || '',
          createdAt: new Date().toISOString(),
          createdBy: submitterName,
          items: consumedList.map(item => ({
            name: item.name,
            quantity: item.qtyConsumed,
            price: item.price
          })),
          totalRevenue: totalMinibar,
          notes: `Post-checkout minibar consumption recorded by ${submitterName}`,
          source: 'post_checkout'
        };
        await saveRecord('minibar', minibarRecordId, minibarRecord);
      }

      if (maintenanceNeeded && (maintenanceNotes || '').trim()) {
        const ticketId = `maint_post_${bookingId}`;
        const creatorName = currentUser?.username || 
          (currentUser?.firstName && currentUser?.lastName ? `${currentUser.firstName} ${currentUser.lastName}` : '') ||
          currentUser?.firstName || 
          currentUser?.email || 
          'Inspector';

        await saveRecord('maintenance_tickets', ticketId, {
          id: ticketId,
          createdBy: creatorName,
          createdAt: new Date().toISOString(),
          villa: initialBooking?.complexName || initialBooking?.villa || 'Unknown Villa',
          unit: initialBooking?.unitName || '',
          description: maintenanceNotes.trim(),
          status: 'Open',
          severity: 'Medium',
          bookingId: bookingId,
          source: 'post_checkout'
        });
      }

      console.log('Post Check-out report submitted successfully!');
      await logActivity({
        type: 'post_checkout',
        status: 'success',
        guestName: initialBooking?.guestName || report.guestName || '',
        bookingId: bookingId,
        complexName: initialBooking?.complexName || initialBooking?.villa || '',
        unitName: initialBooking?.unitName || '',
        submittedBy: currentUser?.username || currentUser?.email || 'Staff'
      });
      onComplete();
    } catch (error: any) {
      console.warn('Error saving post-checkout report:', error);
      console.error('Failed to submit post-checkout report');
      await logActivity({
        type: 'post_checkout',
        status: 'failed',
        guestName: initialBooking?.guestName || '',
        bookingId: initialBooking?.id || initialBooking?.confirmationCode || '',
        complexName: initialBooking?.complexName || initialBooking?.villa || '',
        unitName: initialBooking?.unitName || '',
        submittedBy: currentUser?.username || currentUser?.email || 'Staff',
        errorMessage: error?.message || String(error)
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isStepComplete = () => {
    if (step >= STEPS_CONFIG.length) {
      if (step === STEPS_CONFIG.length) return minibarPhoto !== null; // Minibar step
      return true; // Sign off step
    }
    const currentStepConfig = STEPS_CONFIG[step];
    return currentStepConfig.items.every(item => {
      const itemData = data[currentStepConfig.id]?.[item.id];
      return itemData && itemData.photos.length >= item.reqCount;
    });
  };

  const renderStepIndicators = () => (
    <div className="flex items-center justify-between mb-6 relative px-4 overflow-x-auto no-scrollbar pb-2">
      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-10 min-w-[300px]"></div>
      {[...STEPS_CONFIG, { id: 'minibar', title: 'Minibar', icon: Coffee }, { id: 'signoff', title: 'Sign-Off', icon: CheckCircle2 }].map((s, idx) => {
        const isActive = step === idx;
        const isPast = step > idx;
        return (
          <div key={s.id} className="flex flex-col items-center gap-1 bg-[#F8FAFC] px-2 shrink-0">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
              isActive ? 'bg-orange-600 border-orange-600 text-white' : 
              isPast ? 'bg-emerald-100 border-emerald-600 text-emerald-600' : 
              'bg-white border-slate-300 text-slate-400'
            }`}>
              <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden sm:block ${isActive || isPast ? 'text-slate-900' : 'text-slate-400'}`}>{s.title}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 sm:py-8">
      <button 
        onClick={onComplete}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Return to Home Menu
      </button>
      {renderStepIndicators()}

      {/* Main Content Area */}
      {step < STEPS_CONFIG.length && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-4">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">{STEPS_CONFIG[step].title}</h2>
            <p className="text-sm text-slate-500">Complete checklist and provide photo evidence.</p>
          </div>

          <div className="space-y-4">
            {STEPS_CONFIG[step].items.map((item) => {
              const itemData = data[STEPS_CONFIG[step].id]?.[item.id] || { photos: [] };
              const isCompleted = itemData.photos.length >= item.reqCount;
              
              return (
                <div key={item.id} className={`p-4 sm:p-5 border rounded-xl shadow-sm transition-all ${isCompleted ? 'bg-orange-50/50 border-orange-500' : 'bg-white border-slate-200 hover:border-orange-200'}`}>
                  <label htmlFor={`${STEPS_CONFIG[step].id}-${item.id}`} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isCompleted && <CheckCircle2 className="w-5 h-5 text-orange-600 shrink-0" />}
                        <h4 className={`font-bold text-sm sm:text-base ${isCompleted ? 'text-orange-900' : 'text-slate-900'}`}>{item.label}</h4>
                      </div>
                      <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isCompleted ? 'text-orange-700/80' : 'text-slate-600'}`}>{item.desc}</p>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${isCompleted ? 'text-orange-600' : 'text-slate-400'}`}>Photo Evidence Required:</span>
                        <span className={`text-[10px] sm:text-xs px-2 py-1 rounded font-medium ${isCompleted ? 'text-orange-700 bg-orange-100' : 'text-amber-600 bg-amber-50'}`}>{item.photoReq}</span>
                      </div>
                    </div>
                    
                    <div className="shrink-0 sm:self-center flex flex-col gap-2">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveCamera({ sectionId: STEPS_CONFIG[step].id, itemId: item.id });
                        }}
                        className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors shadow-sm whitespace-nowrap w-full sm:w-auto"
                      >
                        <Camera className="w-4 h-4" /> Take Photo
                      </button>
                      <label className="inline-flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm cursor-pointer transition-colors shadow-sm whitespace-nowrap w-full sm:w-auto">
                        <Upload className="w-4 h-4" /> Upload Photo
                        <input id={`${STEPS_CONFIG[step].id}-${item.id}`} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoAdd(STEPS_CONFIG[step].id, item.id, e)} />
                      </label>
                    </div>
                  </label>

                  {itemData.photos.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex flex-wrap gap-3">
                        {itemData.photos.map((src, i) => (
                           <div key={i} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden border border-slate-200 group shadow-sm">
                              <img src={src} alt="Captured" className="w-full h-full object-cover" />
                              <button
                                onClick={() => {
                                  setData(prev => ({
                                    ...prev,
                                    [STEPS_CONFIG[step].id]: {
                                      ...prev[STEPS_CONFIG[step].id],
                                      [item.id]: {
                                        ...itemData,
                                        photos: itemData.photos.filter((_, idx) => idx !== i)
                                      }
                                    }
                                  }));
                                }}
                                className="absolute top-1.5 right-1.5 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === STEPS_CONFIG.length && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-4">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Minibar Consumption</h2>
            <p className="text-sm text-slate-500">
              Open the minibar fridge, snack display tray, and/or wine cabinet. 
              Upload 1 clear photo of the minibar interior and snack tray showing the current state of remaining stock.
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
          
          <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Record Remaining Stock</h3>
          <div className="space-y-1">
            <div className="flex font-bold text-xs uppercase text-slate-500 pb-2 px-2">
              <div className="flex-1">Item</div>
              <div className="w-24 text-right">Price (IDR)</div>
              <div className="w-24 text-center">Check-In Qty</div>
              <div className="w-24 text-center">Remaining</div>
            </div>
            {MINIBAR_ITEMS.map(item => {
              const checkInQty = preCheckInStock && preCheckInStock[item.name] !== undefined ? preCheckInStock[item.name] : item.parQty;
              return (
                <div key={item.name} className="flex items-center p-2 hover:bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.location}</div>
                  </div>
                  <div className="w-24 text-right text-sm text-slate-600">
                    {item.price.toLocaleString('id-ID')}
                  </div>
                  <div className="w-24 text-center text-sm font-medium text-slate-500">
                    {checkInQty}
                  </div>
                  <div className="w-24 flex justify-center">
                    <input 
                      type="number" 
                      min="0"
                      max={checkInQty}
                      className="w-16 p-1 text-center border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={minibarRemaining[item.name] !== undefined ? minibarRemaining[item.name] : checkInQty}
                      onChange={(e) => {
                         const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                         setMinibarRemaining(prev => ({...prev, [item.name]: Math.min(val, checkInQty)}));
                      }}
                      placeholder={checkInQty.toString()}
                    />
                  </div>
                </div>
              );
            })}
            
            <div className="mt-4 p-4 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-200 font-bold text-slate-900">
              <span>Calculated Total Bill:</span>
              <span className="text-lg text-rose-600">
                Rp {MINIBAR_ITEMS.reduce((acc, curr) => {
                  const checkInQty = preCheckInStock && preCheckInStock[curr.name] !== undefined ? preCheckInStock[curr.name] : curr.parQty;
                  const remaining = minibarRemaining[curr.name] !== undefined ? minibarRemaining[curr.name] : checkInQty;
                  const consumed = Math.max(0, checkInQty - remaining);
                  return acc + (consumed * curr.price);
                }, 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      )}

      {step === STEPS_CONFIG.length + 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-6">
          <div className="text-center mb-2 border-b border-slate-100 pb-6">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Final Verification</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Please review all logged evidence and minibar consumption. Sign off to complete this post-checkout report.
            </p>
          </div>

          <div className="p-4 sm:p-5 bg-rose-50/50 rounded-xl border border-rose-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={maintenanceNeeded}
                onChange={(e) => setMaintenanceNeeded(e.target.checked)}
                className="mt-1 w-5 h-5 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
              />
              <div>
                <span className="text-sm font-bold text-slate-900 block">Report Engineering / Maintenance Issue</span>
                <span className="text-xs text-slate-600 block mt-1 leading-relaxed">Check this if any items require immediate repair or attention.</span>
              </div>
            </label>
            
            {maintenanceNeeded && (
              <div className="mt-4 pl-8">
                <textarea 
                  value={maintenanceNotes}
                  onChange={(e) => setMaintenanceNotes(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  className="w-full p-4 bg-white border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-400"
                  rows={4}
                />
                <p className="text-xs text-rose-600 mt-2 font-medium">
                  Note: If mechanical failures or damages were identified, attach the relevant photo proof directly to an engineering ticket.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Concierge Signature / Name <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name to sign"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium placeholder-slate-400"
            />
            {!signature.trim() && (
              <p className="text-xs text-amber-600 mt-1.5 font-medium">
                * Please enter your signature or name above to submit.
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={isProcessing}
              className="flex-1 py-3 sm:py-4 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!signature.trim() || isProcessing}
              className="flex-[2] flex items-center justify-center gap-2 py-3 sm:py-4 bg-orange-600 text-white rounded-lg font-bold shadow-md shadow-orange-200 hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:shadow-none"
            >
              {isProcessing ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Buttons for previous steps */}
      {step < STEPS_CONFIG.length + 1 && (
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => step === 0 ? onComplete() : setStep(s => s - 1)}
            className="flex-1 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={() => {
              if (step < STEPS_CONFIG.length + 1) setStep(s => s + 1);
            }}
            disabled={!isStepComplete()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 text-white rounded-lg font-bold shadow-md shadow-orange-200 hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:shadow-none"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Camera Modal */}
      {(activeCamera || activeMinibarCamera) && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Take Photo</h3>
              <button 
                onClick={() => { setActiveCamera(null); setActiveMinibarCamera(false); }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="relative bg-black aspect-video flex items-center justify-center">
              {/* @ts-ignore */}
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="p-4 bg-slate-50 flex justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-full font-bold shadow-md shadow-orange-200 transition-colors"
              >
                <Camera className="w-5 h-5" /> Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
