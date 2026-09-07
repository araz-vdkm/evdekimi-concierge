import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckSquare, CheckCircle2, ChevronRight, X, Home as HomeIcon, Droplets, BedDouble, Bath, Upload, RefreshCcw, ChevronLeft, Coffee } from 'lucide-react';
import { saveRecord } from '../lib/db';
import { logActivity } from '../lib/activityLog';
import { compressImage } from '../lib/utils';
import { uploadImageToStorage } from '../lib/storage';

interface PreCheckInFlowProps {
  onComplete: () => void;
  initialBooking?: any;
  currentUser?: any;
}


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

const STEPS_CONFIG = [
  {
    id: 'exterior',
    title: 'Exterior, Garden & Pool',
    icon: Droplets,
    items: [
      { id: 'garden', label: 'Garden Conditions', desc: 'Inspect overall landscaping, lawn condition, pathways, and outdoor cleanliness.', photoReq: '4 photos (different angles)', reqCount: 4 },
      { id: 'poolClean', label: 'Pool Cleanness', desc: 'Verify water clarity, surface debris removal, and overall pool deck hygiene.', photoReq: '1 photo of pool condition', reqCount: 1 },
      { id: 'poolSunbeds', label: 'Pool Sunbeds', desc: 'Inspect fabric, frames, and cushions for stains, dust, or moisture.', photoReq: '1 photo of sunbeds', reqCount: 1 },
      { id: 'poolUmbrella', label: 'Pool Umbrella', desc: 'Open and inspect umbrella fabric, pole integrity, and cleanliness.', photoReq: '1 photo of umbrella', reqCount: 1 },
    ]
  },
  {
    id: 'indoor',
    title: 'Indoor Living & Dining',
    icon: HomeIcon,
    items: [
      { id: 'scuff', label: 'Scuff & Damage Tracking', desc: 'Inspect walls, furniture edges, baseboards, and artwork for pre-existing scuffs/wear.', photoReq: '1 photo per room showing wall/furniture condition', reqCount: 1 },
      { id: 'utilities', label: 'Utilities & Appliances', desc: 'Test that TV turns on, A/C runs silently, and all light fixtures operate properly.', photoReq: '1 photo per room verifying active functionality', reqCount: 1 },
      { id: 'climate', label: 'Climate Control', desc: 'Verify that the thermostat/AC is set to 22°C and functioning correctly.', photoReq: '1 photo per A/C unit displaying 22°C', reqCount: 1 },
      { id: 'coffee', label: 'Coffee Station Setup', desc: 'Confirm descaled, clean, stocked with full set of capsules and sugar/sweetener.', photoReq: '1 photo of coffee machine & full capsule set', reqCount: 1 },
      { id: 'kitchen', label: 'Kitchen Utensils', desc: 'Inspect drawers/cabinets for complete clean set of cutlery, cookware, dishware.', photoReq: '1 photo showing full utensil inventory', reqCount: 1 },
    ]
  },
  {
    id: 'bedroom',
    title: 'Bedroom Inspection',
    icon: BedDouble,
    items: [
      { id: 'bedding', label: 'Bedding & Presentation', desc: 'Check bed symmetry, smooth duvet, pillow alignment, clear space under bed, dust-free nightstands.', photoReq: '1 photo per bedroom of full bed staging', reqCount: 1 },
      { id: 'utilities', label: 'A/C, TV & Lights', desc: 'Turn on bedroom TV, lights, and verify A/C operation.', photoReq: '1 photo per bedroom demonstrating working tech', reqCount: 1 },
      { id: 'scuffs', label: 'Scuffs & Edges', desc: 'Check walls, wardrobe doors, and artwork.', photoReq: '1 photo per bedroom showing wall/edge conditions', reqCount: 1 },
    ]
  },
  {
    id: 'bathroom',
    title: 'Bathroom & Plumbing',
    icon: Bath,
    items: [
      { id: 'hygiene', label: 'Hygiene & Sanitation', desc: 'Check toilet inside/out, basin polish, shower glass clarity, neat towel placement.', photoReq: 'Photos of toilet, basin/mirror/shower, towel placement', reqCount: 3 },
      { id: 'plumbing', label: 'Plumbing & Water Flow', desc: 'Turn on hot water to confirm delivery, pressure, and clear drain speed.', photoReq: '1 photo per bathroom showing running water', reqCount: 1 },
      { id: 'consumables', label: 'Consumables', desc: 'Confirm full stock of toilet paper, tissue boxes, and hygiene refills.', photoReq: '1 photo per bathroom verifying stock', reqCount: 1 },
      { id: 'toiletries', label: 'Toiletries & Amenities', desc: 'Verify full presentation set of luxury soaps, body wash, shampoo, conditioner, lotion.', photoReq: '1 photo per bathroom showing arrangement', reqCount: 1 },
      { id: 'towels', label: 'Towel Set Verification', desc: 'Confirm full set of bath/hand towels, face cloths, bath mats per brand standards.', photoReq: '1 photo per bathroom displaying setup', reqCount: 1 },
    ]
  }
];

type SectionData = Record<string, { photos: string[] }>;

export default function PreCheckInFlow({ onComplete, initialBooking, currentUser }: PreCheckInFlowProps) {
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<Record<string, SectionData>>({
    exterior: {},
    indoor: {},
    bedroom: {},
    bathroom: {}
  });
  
  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false);
  const [minibarPhoto, setMinibarPhoto] = useState<string | null>(null);
  const [minibarStock, setMinibarStock] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    MINIBAR_ITEMS.forEach(item => {
      initial[item.name] = item.parQty;
    });
    return initial;
  });
  const [activeMinibarCamera, setActiveMinibarCamera] = useState(false);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [signature, setSignature] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCamera, setActiveCamera] = useState<{sectionId: string, itemId: string} | null>(null);
  const webcamRef = useRef<Webcam>(null);

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
    }
  }, [webcamRef, activeCamera]);

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
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setMinibarPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const captureMinibarPhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setMinibarPhoto(imageSrc);
        setActiveMinibarCamera(false);
      }
    }
  };

const handleRemovePhoto = (sectionId: string, itemId: string, photoIndex: number) => {
    setData(prev => {
      const itemData = prev[sectionId]?.[itemId];
      if (!itemData) return prev;
      
      const newPhotos = [...itemData.photos];
      newPhotos.splice(photoIndex, 1);
      
      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [itemId]: {
            ...itemData,
            photos: newPhotos
          }
        }
      };
    });
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
      
      const bookingId = initialBooking?.id || initialBooking?.confirmationCode || `pre_checkin_${Date.now()}`;

      const stockList = MINIBAR_ITEMS.map(item => ({
        ...item,
        qtyStock: minibarStock[item.name] !== undefined ? minibarStock[item.name] : item.parQty
      }));

      const report = {
        type: 'pre_checkin',
        timestamp: new Date().toISOString(),
        submittedBy: submitterName,
        bookingId: bookingId,
        confirmationCode: initialBooking?.confirmationCode || initialBooking?.id || '',
        guestName: initialBooking?.fullName || initialBooking?.guestName || 'Unknown',
        unitName: initialBooking?.unitName || '',
        complexName: initialBooking?.complexName || initialBooking?.villa || '',
        checkInDate: initialBooking?.checkInDate || '',
        checkOutDate: initialBooking?.checkOutDate || '',
        data,
        maintenanceNeeded,
        maintenanceNotes,
        signature,
        minibarStock: stockList,
      };
      
      // Upload minibar photo if data url
      let uploadedMinibarPhoto = minibarPhoto;
      if (minibarPhoto && minibarPhoto.startsWith('data:')) {
        try {
          const compressed = await compressImage(minibarPhoto, 1200, 1200, 0.85);
          const path = `reports/pre_checkin/${bookingId}/minibar_photo.jpg`;
          uploadedMinibarPhoto = await uploadImageToStorage(compressed, path);
        } catch (e) {}
      }

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
                const path = `reports/pre_checkin/${bookingId}/${sectionId}_${itemId}_${idx}.jpg`;
                const url = await uploadImageToStorage(compressed, path);
                processedData[sectionId][itemId].photos[idx] = url;
             })();
             uploadTasks.push(task);
          });
        }
      }
      await Promise.all(uploadTasks);

      let processedSignature = report.signature;
      
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
        minibarPhoto: uploadedMinibarPhoto,
        lastEditedAt: new Date().toISOString()
      };

      await saveRecord('pre_checkin', bookingId, finalPayload);
      if (initialBooking?.confirmationCode && initialBooking.confirmationCode !== bookingId) {
        await saveRecord('pre_checkin', initialBooking.confirmationCode, finalPayload);
      }
      if (initialBooking?.id && initialBooking.id !== bookingId && initialBooking.id !== initialBooking.confirmationCode) {
        await saveRecord('pre_checkin', initialBooking.id, finalPayload);
      }
      if (initialBooking?.guestName) {
        await saveRecord('pre_checkin', `name_${initialBooking.guestName.toLowerCase().trim()}`, finalPayload);
      }
      if (initialBooking?.unitName && initialBooking?.checkInDate) {
        await saveRecord('pre_checkin', `unit_${initialBooking.unitName.toLowerCase().trim()}_${initialBooking.checkInDate}`, finalPayload);
      }

      if (maintenanceNeeded && (maintenanceNotes || '').trim()) {
        const ticketId = `maint_pre_${bookingId}`;
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
          source: 'pre_checkin'
        });
      }

      if (initialBooking?.id) {
        localStorage.removeItem('draft_pre_checkin_' + initialBooking.id);
      }

      console.log('Inspection Report submitted successfully!');
      await logActivity({
        type: 'pre_checkin',
        status: 'success',
        guestName: initialBooking?.guestName || report.guestName || '',
        bookingId: bookingId,
        complexName: initialBooking?.complexName || initialBooking?.villa || '',
        unitName: initialBooking?.unitName || '',
        submittedBy: currentUser?.username || currentUser?.email || 'Staff'
      });
      onComplete();
    } catch (error: any) {
      console.warn('Error saving pre-checkin report:', error);
      console.error('Failed to submit pre-checkin report');
      await logActivity({
        type: 'pre_checkin',
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
    if (step >= STEPS_CONFIG.length) return true;
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
              isActive ? 'bg-emerald-600 border-emerald-600 text-white' : 
              isPast ? 'bg-emerald-100 border-emerald-600 text-emerald-600' : 
              'bg-white border-slate-300 text-slate-400'
            }`}>
              <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden sm:block ${isActive || isPast ? 'text-slate-900' : 'text-slate-400'}`}>
              {idx + 1}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 sm:py-8">
      <button 
        onClick={onComplete}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Return to Home Menu
      </button>
      {renderStepIndicators()}

      {step < STEPS_CONFIG.length && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-4">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">{STEPS_CONFIG[step].title}</h2>
            <p className="text-sm text-slate-500">Complete checklist and provide photo evidence.</p>
          </div>

          <div className="space-y-4">
            {STEPS_CONFIG[step].items.map(item => {
              const itemData = data[STEPS_CONFIG[step].id]?.[item.id] || { photos: [] };
              const isCompleted = itemData.photos.length >= item.reqCount;
              
              return (
                <div key={item.id} className={`p-4 sm:p-5 border rounded-xl shadow-sm transition-all ${isCompleted ? 'bg-emerald-50/50 border-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
                  <label htmlFor={`${STEPS_CONFIG[step].id}-${item.id}`} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                        <h4 className={`font-bold text-sm sm:text-base ${isCompleted ? 'text-emerald-900' : 'text-slate-900'}`}>{item.label}</h4>
                      </div>
                      <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isCompleted ? 'text-emerald-700/80' : 'text-slate-600'}`}>{item.desc}</p>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>Photo Evidence Required:</span>
                        <span className={`text-[10px] sm:text-xs px-2 py-1 rounded font-medium ${isCompleted ? 'text-emerald-700 bg-emerald-100' : 'text-amber-600 bg-amber-50'}`}>{item.photoReq}</span>
                      </div>
                    </div>
                    
                    <div className="shrink-0 sm:self-center flex flex-col gap-2">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveCamera({ sectionId: STEPS_CONFIG[step].id, itemId: item.id });
                        }}
                        className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors shadow-sm whitespace-nowrap w-full sm:w-auto"
                      >
                        <Camera className="w-4 h-4" /> Take Photo
                      </button>
                      <label className="inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm cursor-pointer transition-colors shadow-sm whitespace-nowrap w-full sm:w-auto">
                        <Upload className="w-4 h-4" /> Upload Photo
                        <input id={`${STEPS_CONFIG[step].id}-${item.id}`} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoAdd(STEPS_CONFIG[step].id, item.id, e)} />
                      </label>
                    </div>
                  </label>
                  
                  {itemData.photos.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex flex-wrap gap-3">
                        {itemData.photos.map((p, i) => (
                           <div key={i} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden border border-slate-200 group shadow-sm">
                              <img src={p} alt="" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => handleRemovePhoto(STEPS_CONFIG[step].id, item.id, i)} 
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

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => step === 0 ? onComplete() : setStep(s => s - 1)}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!isStepComplete()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-lg font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:shadow-none"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {step === STEPS_CONFIG.length && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-4">
          <div className="mb-4 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Minibar Status Check</h2>
            <p className="text-sm text-slate-500">
              Open the minibar fridge, snack display tray, and/or wine cabinet. 
              Upload or take 1 clear photo of the minibar interior and snack tray showing the current stock, and record available item quantities.
            </p>
          </div>
          
          <div className="flex gap-2 w-full mb-6">
            <button 
              type="button"
              onClick={() => setActiveMinibarCamera(true)}
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors shadow-sm whitespace-nowrap flex-1 cursor-pointer"
            >
              <Camera className="w-4 h-4" /> Take Photo
            </button>
            <label className="inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-lg font-semibold text-xs sm:text-sm cursor-pointer transition-colors shadow-sm whitespace-nowrap flex-1">
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
                type="button"
                onClick={() => setMinibarPhoto(null)}
                className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Record Available Minibar Items</h3>
          <div className="space-y-1">
            <div className="flex font-bold text-xs uppercase text-slate-500 pb-2 px-2">
              <div className="flex-1">Item</div>
              <div className="w-20 text-center">Par Qty</div>
              <div className="w-24 text-center">Current Stock</div>
            </div>
            {MINIBAR_ITEMS.map(item => (
              <div key={item.name} className="flex items-center p-2 hover:bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.location}</div>
                </div>
                <div className="w-20 text-center text-sm font-medium text-slate-400">
                  {item.parQty}
                </div>
                <div className="w-24 flex justify-center">
                  <input 
                    type="number" 
                    min="0"
                    max={item.parQty}
                    className="w-16 p-1 text-center border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={minibarStock[item.name] !== undefined ? minibarStock[item.name] : ""}
                    onChange={(e) => {
                       const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                       setMinibarStock(prev => ({...prev, [item.name]: Math.min(val, item.parQty)}));
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-lg font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {step === STEPS_CONFIG.length + 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-6">
          <div className="text-center mb-2 border-b border-slate-100 pb-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Final Audit Sign-Off</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Please review all logged evidence. Submit to update the status from "Clean" to "Inspected" and release keys to the Front Desk.
            </p>
          </div>

          <div className="p-4 sm:p-5 bg-rose-50/50 rounded-xl border border-rose-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="mt-0.5 w-5 h-5 text-rose-600 rounded border-rose-300 focus:ring-rose-500" 
                checked={maintenanceNeeded} 
                onChange={e => setMaintenanceNeeded(e.target.checked)} 
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Log Maintenance Ticket</h4>
                <p className="text-xs text-slate-500 mt-1">Check if any defects require immediate engineering attention.</p>
              </div>
            </label>
            {maintenanceNeeded && (
              <textarea 
                placeholder="Describe maintenance issues and required actions..." 
                className="mt-4 w-full p-3 border border-rose-200 rounded-lg focus:ring-rose-500 outline-none text-sm bg-white shadow-sm resize-none"
                rows={3}
                value={maintenanceNotes}
                onChange={e => setMaintenanceNotes(e.target.value)}
              ></textarea>
            )}
          </div>

          <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Inspector Signature <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">Type your full name to digitally sign off on this audit.</p>
            <input 
              type="text" 
              placeholder="e.g. John Doe"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-emerald-500 outline-none text-sm bg-white shadow-sm font-medium" 
              value={signature} 
              onChange={e => setSignature(e.target.value)} 
            />
            {!signature.trim() && (
              <p className="text-xs text-amber-600 mt-1.5 font-medium">
                * Please enter your signature or name above to submit.
              </p>
            )}
          </div>

          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => setStep(STEPS_CONFIG.length)} 
              disabled={isProcessing}
              className="flex-1 py-3 sm:py-4 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={!signature.trim() || isProcessing} 
              className="flex-[2] flex items-center justify-center gap-2 py-3 sm:py-4 bg-emerald-600 text-white rounded-lg font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:shadow-none"
            >
              {isProcessing ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Sign-Off & Release
                </>
              )}
            </button>
          </div>
        </div>
      )}

            {activeMinibarCamera && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Take Minibar Photo</h3>
              <button onClick={() => setActiveMinibarCamera(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
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
                onClick={captureMinibarPhoto}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold shadow-md shadow-emerald-200 transition-colors cursor-pointer"
              >
                <Camera className="w-5 h-5" /> Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCamera && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Take Photo</h3>
              <button onClick={() => setActiveCamera(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
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
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold shadow-md shadow-emerald-200 transition-colors"
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
