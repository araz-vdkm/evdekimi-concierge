import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, ScanFace, FileText, CheckCircle2, ChevronRight, RefreshCcw, Calendar, Users, Building, ChevronLeft } from 'lucide-react';
import { getAccessToken, getGoogleToken } from "../lib/auth";
import { Guest, QuestionnaireAnswers } from '../types';

interface CheckInFlowProps {
  spreadsheetId: string;
  onComplete: () => void;
  initialBooking?: any;
  currentUser?: any;
}

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/auth';
import { saveRecord } from '../lib/db';
import { logActivity } from '../lib/activityLog';
import { compressImage, normalizeCountryName } from '../lib/utils';
import { uploadImageToStorage } from '../lib/storage';

export default function CheckInFlow({ spreadsheetId, onComplete, initialBooking, currentUser }: CheckInFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Scanned Data
  const [guestsDetails, setGuestsDetails] = useState<Partial<Guest & { photoBase64?: string; existingId?: string; existingPhotoUrl?: string; gender?: string }>[]>([
    { fullName: initialBooking?.guestName || '' }
  ]);
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0);
  
  // Questionnaire Answers
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    celebration: '',
    interests: '',
    dietary: '',
    nextDestination: ''
  });

  const [booking, setBooking] = useState({
    checkInDate: initialBooking?.checkInDate || new Date().toISOString().split('T')[0],
    checkOutDate: initialBooking?.checkOutDate || '',
    complexName: initialBooking?.complexName || '',
    unitName: initialBooking?.unitName || '',
    guestsCount: '', // Intentionally empty to require manual entry
    contactNumber: '',
    contactEmail: ''
  });

  const [complexes, setComplexes] = useState<string[]>([]);
  const [unitsByComplex, setUnitsByComplex] = useState<Record<string, string[]>>({});
  const [upsellData, setUpsellData] = useState<any>(null);

  const webcamRef = useRef<Webcam>(null);

  React.useEffect(() => {
    const fetchComplexes = async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/complexes', {
          headers: {
            'Authorization': `Bearer ${token}`, "x-google-oauth-token": getGoogleToken()
          }
        });
        if (res.ok) {
          const data = await res.json();
          setComplexes(data.complexes || []);
          setUnitsByComplex(data.unitsByComplex || {});
        }
      } catch (err) {
        console.warn("Failed to fetch complexes (server might be restarting):", err?.message);
      }
    };
    fetchComplexes();
  }, []);

  React.useEffect(() => {
    const fetchExistingData = async () => {
      // Check if we are editing an existing registration
      const isEdit = localStorage.getItem(`guest_reg_${initialBooking?.id}`) === 'true';
      if (!initialBooking?.id || !isEdit) return;

      try {
        const guestsRef = collection(db, 'guests');
        const q = query(guestsRef, where('bookingId', '==', initialBooking.id));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const fetchedGuests: any[] = [];
          querySnapshot.forEach(doc => {
            fetchedGuests.push({ existingId: doc.id, ...doc.data() });
          });
          
          if (fetchedGuests.length > 0) {
            // Sort by a field if necessary, or just keep order
            // Pre-fill guestsDetails
            setGuestsDetails(fetchedGuests.map(g => ({
              existingId: g.id || g.existingId,
              fullName: g.fullName || '',
              passportNumber: g.passportNumber || '',
              nationality: g.nationality || '',
              dob: g.dob || '',
              gender: g.gender || '',
              status: g.status || '',
              photoBase64: '',
              existingPhotoUrl: g.photo || '' 
            })));
            
            // Pre-fill booking details from the first guest
            const firstGuest = fetchedGuests[0];
            setBooking(prev => ({
              ...prev,
              checkInDate: firstGuest.checkInDate || prev.checkInDate,
              checkOutDate: firstGuest.checkOutDate || prev.checkOutDate,
              complexName: firstGuest.complexName || prev.complexName,
              unitName: firstGuest.unitName || prev.unitName,
              guestsCount: firstGuest.guestsCount || prev.guestsCount,
              contactNumber: firstGuest.contactNumber || prev.contactNumber,
              contactEmail: firstGuest.contactEmail || prev.contactEmail,
            }));

            // Attempt to pre-fill answers based on purpose
            if (firstGuest.purpose && firstGuest.purpose.startsWith('Celebrating ')) {
              setAnswers(prev => ({ ...prev, celebration: firstGuest.purpose.replace('Celebrating ', '') }));
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch existing guests for edit:", e);
      }
    };
    fetchExistingData();
  }, [initialBooking?.id]);

  const retakePassport = useCallback(() => {
    // Clear the captured photo (and whatever passport-analysis fields came
    // with it) so the live camera view remounts - the button reads
    // "Retake Passport" only while photoBase64 is set, so this always runs
    // before the next actual capture.
    setGuestsDetails(prev => {
      const updated = [...prev];
      updated[currentGuestIndex] = {};
      return updated;
    });
  }, [currentGuestIndex]);

  const capturePassport = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setIsProcessing(true);
    const compressedImage = await compressImage(imageSrc, 1200, 1200, 0.8);
    const base64Data = compressedImage.split(',')[1];
    
    try {
      const token = await getAccessToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);
      
      const res = await fetch('/api/analyze-passport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, "x-google-oauth-token": getGoogleToken()
        },
        body: JSON.stringify({ imageBase64: base64Data }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error("Failed to analyze passport");
      const data = await res.json();
      
      const newGuest = { ...data, photoBase64: base64Data, status: 'Checked In' };
      setGuestsDetails(prev => {
        const updated = [...prev];
        updated[currentGuestIndex] = newGuest;
        return updated;
      });
      
    } catch (err: any) {
      console.warn("Passport analysis failed or timed out:", err);
      // Fallback: save photo and set status to 'In Queue'
      const fallbackGuest = { photoBase64: base64Data, status: 'In Queue' };
      setGuestsDetails(prev => {
        const updated = [...prev];
        updated[currentGuestIndex] = { ...updated[currentGuestIndex], ...fallbackGuest };
        return updated;
      });
    } finally {
      setIsProcessing(false);
    }
  }, [webcamRef, currentGuestIndex, booking.guestsCount]);

  const handleManualScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressedResult = await compressImage(reader.result as string, 1200, 1200, 0.8);
        const base64String = compressedResult.split(',')[1];
        
        const token = await getAccessToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);
        
        const res = await fetch('/api/analyze-passport', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, "x-google-oauth-token": getGoogleToken()
          },
          body: JSON.stringify({ imageBase64: base64String }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error("Failed to analyze passport");
        const data = await res.json();
        const newGuest = { ...data, photoBase64: base64String, status: 'Checked In' };
        setGuestsDetails(prev => {
          const updated = [...prev];
          updated[currentGuestIndex] = newGuest;
          return updated;
        });
        
      } catch (err: any) {
        console.warn("Passport analysis failed or timed out:", err);
        const fallbackGuest = { photoBase64: (await compressImage(reader.result as string, 1200, 1200, 0.8)).split(',')[1], status: 'In Queue' };
        setGuestsDetails(prev => {
          const updated = [...prev];
          updated[currentGuestIndex] = { ...updated[currentGuestIndex], ...fallbackGuest };
          return updated;
        });
      } finally {
        setIsProcessing(false);
      e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteQuestionnaire = async () => {
    setIsProcessing(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/analyze-upsell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, "x-google-oauth-token": getGoogleToken()
        },
        body: JSON.stringify({ guestDetails: guestsDetails, answers })
      });
      
      if (!res.ok) throw new Error("Failed to generate upsell");
      const data = await res.json();
      setUpsellData(data.upsell);
      setStep(4);
    } catch (err) {
      console.warn(err);
      console.error('Error processing data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsProcessing(true);
    try {
      const token = await getAccessToken();
      
      for (let i = 0; i < guestsDetails.length; i++) {
        const guestDetail = guestsDetails[i];
        
        let uploadedPhotoUrl = (guestDetail as any).existingPhotoUrl || '';
        if (guestDetail.photoBase64) {
          const compPhoto = await compressImage(`data:image/jpeg;base64,${guestDetail.photoBase64}`, 1200, 1200, 0.85);
          uploadedPhotoUrl = await uploadImageToStorage(compPhoto, `guests/${initialBooking?.id || 'manual'}/passport_${i}.jpg`);
        }
        
        const finalGuest: any = {
          id: guestDetail.existingId || crypto.randomUUID(),
          fullName: guestDetail.fullName || '',
          passportNumber: guestDetail.passportNumber || '',
          nationality: normalizeCountryName(guestDetail.nationality),
          dob: guestDetail.dob || '',
          purpose: answers.celebration ? `Celebrating ${answers.celebration}` : 'Leisure',
          upsell: upsellData && guestDetail.fullName ? (upsellData[guestDetail.fullName] || upsellData['general'] || '') : '',
          gender: (guestDetail as any).gender || '',
          status: (guestDetail as any).status === 'In Queue' ? 'In Queue' : 'Checked In',
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          complexName: booking.complexName,
          unitName: booking.unitName,
          guestsCount: booking.guestsCount,
          bookingId: initialBooking?.confirmationCode || initialBooking?.id || '',
          confirmationCode: initialBooking?.confirmationCode || initialBooking?.id || '',
          photo: uploadedPhotoUrl || '',
          contactNumber: booking.contactNumber,
          contactEmail: booking.contactEmail,
          celebrationAnswer: answers.celebration || '',
          interestsAnswer: answers.interests || '',
          dietaryAnswer: answers.dietary || '',
          nextDestinationAnswer: answers.nextDestination || ''
        };

        try {
          const res = await fetch('/api/guests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`, "x-google-oauth-token": getGoogleToken()
            },
            body: JSON.stringify({ spreadsheetId, guest: finalGuest })
          });
          if (!res.ok) throw new Error("API error");
          finalGuest._synced = true;
        } catch (e) {
          console.warn("Could not send guest to server, saving locally", e);
          finalGuest._synced = false;
        }

        // Always save to local storage cache so guest list is persistent
        try {
          const savedGuests = JSON.parse((await idbGet("concierge_registered_guests")) || '[]');
          savedGuests.unshift(finalGuest);
          await idbSet("concierge_registered_guests", JSON.stringify(savedGuests));
        } catch (e) {}
        
        // Also save to Firebase guests collection for cross-device sync
        try {
           await saveRecord('guests', finalGuest.id, finalGuest);
        } catch (e) {
           console.warn("Failed to save guest to Firebase collection:", e);
        }
      }
      
      const regPayload = {
        completed: true,
        timestamp: new Date().toISOString(),
        bookingId: initialBooking?.id || initialBooking?.confirmationCode || '',
        confirmationCode: initialBooking?.confirmationCode || initialBooking?.id || '',
        guestName: initialBooking?.guestName || initialBooking?.fullName || guestsDetails[0]?.fullName || 'Guest',
        complexName: booking.complexName || '',
        unitName: booking.unitName || '',
        checkInDate: booking.checkInDate || '',
        checkOutDate: booking.checkOutDate || '',
        guestCount: guestsDetails.length
      };

      if (initialBooking?.id) {
        await saveRecord('guest_reg', initialBooking.id, regPayload);
      }
      if (initialBooking?.confirmationCode && initialBooking.confirmationCode !== initialBooking?.id) {
        await saveRecord('guest_reg', initialBooking.confirmationCode, regPayload);
      }
      if (regPayload.guestName) {
        await saveRecord('guest_reg', `name_${regPayload.guestName.toLowerCase().trim()}`, regPayload);
      }
      if (regPayload.unitName && regPayload.checkInDate) {
        await saveRecord('guest_reg', `unit_${regPayload.unitName.toLowerCase().trim()}_${regPayload.checkInDate}`, regPayload);
      }
      await logActivity({
        type: 'registration',
        status: 'success',
        guestName: regPayload.guestName,
        bookingId: regPayload.bookingId || regPayload.confirmationCode,
        complexName: regPayload.complexName,
        unitName: regPayload.unitName,
        submittedBy: currentUser?.username || currentUser?.email || 'Staff'
      });
      onComplete();
    } catch (err: any) {
      console.warn(err);
      console.error('Error saving check-in');
      await logActivity({
        type: 'registration',
        status: 'failed',
        guestName: initialBooking?.guestName || guestsDetails[0]?.fullName || '',
        bookingId: initialBooking?.confirmationCode || initialBooking?.id || '',
        complexName: booking.complexName,
        unitName: booking.unitName,
        submittedBy: currentUser?.username || currentUser?.email || 'Staff',
        errorMessage: err?.message || String(err)
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 sm:py-8">
      <button 
        onClick={onComplete}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Return to Home Menu
      </button>
      {/* Stepper */}
      <div className="flex items-center justify-between mb-6 relative px-2 sm:px-4 overflow-x-auto no-scrollbar pb-2">
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-10 min-w-[300px]"></div>
        {[
          { num: 1, label: 'Booking', icon: Calendar },
          { num: 2, label: 'Scan ID', icon: ScanFace },
          { num: 3, label: 'Questionnaire', icon: FileText },
          { num: 4, label: 'Review', icon: CheckCircle2 }
        ].map((s) => (
          <div key={s.num} className="flex flex-col items-center gap-2 bg-[#F8FAFC] px-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= s.num ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${step >= s.num ? 'text-blue-600' : 'text-slate-400'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Booking Details */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
          <div className="text-center mb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Booking Details</h2>
            <p className="text-sm text-slate-500">Enter check-in dates and complex details</p>
          </div>

          {initialBooking && (initialBooking.villa || initialBooking.complexName) && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Villa ID (From Booking)</label>
              <div className="text-sm font-bold text-slate-800">{initialBooking.villa || initialBooking.complexName}</div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">Check-In Date</label>
              <input
                type="date"
                value={booking.checkInDate}
                onChange={e => setBooking({...booking, checkInDate: e.target.value})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">Check-Out Date</label>
              <input
                type="date"
                value={booking.checkOutDate}
                onChange={e => setBooking({...booking, checkOutDate: e.target.value})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">Complex Name</label>
              <select
                value={booking.complexName}
                onChange={e => setBooking({...booking, complexName: e.target.value, unitName: ''})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Select Complex...</option>
                {booking.complexName && !complexes.includes(booking.complexName) && (
                  <option value={booking.complexName}>{booking.complexName}</option>
                )}
                {complexes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">Unit Name</label>
              <select
                value={booking.unitName}
                onChange={e => setBooking({...booking, unitName: e.target.value})}
                disabled={!booking.complexName}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
              >
                <option value="">Select Unit...</option>
                {booking.unitName && (!booking.complexName || !unitsByComplex[booking.complexName]?.includes(booking.unitName)) && (
                  <option value={booking.unitName}>{booking.unitName}</option>
                )}
                {booking.complexName && unitsByComplex[booking.complexName]?.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">Quantity of Guests</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 2"
                value={booking.guestsCount}
                onChange={e => setBooking({...booking, guestsCount: e.target.value})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">Contact Number</label>
              <input
                type="tel"
                placeholder="e.g. +1 234 567 8900"
                value={booking.contactNumber}
                onChange={e => setBooking({...booking, contactNumber: e.target.value})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 sm:col-span-2">
              <label className="block text-sm font-semibold text-blue-900 mb-2">Contact Email</label>
              <input
                type="email"
                placeholder="e.g. guest@example.com"
                value={booking.contactEmail}
                onChange={e => setBooking({...booking, contactEmail: e.target.value})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            {!booking.guestsCount && (
              <p className="text-xs text-red-500 font-medium mb-2 text-center">* Please enter the number of guests to proceed</p>
            )}
            <button
              onClick={() => {
                const count = parseInt(booking.guestsCount) || 1;
                if (guestsDetails.length > count) {
                  setGuestsDetails(prev => prev.slice(0, count));
                }
                setStep(2);
              }}
              disabled={!booking.checkOutDate || !booking.complexName || !booking.unitName || !booking.guestsCount || !booking.contactNumber || !booking.contactEmail}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors disabled:opacity-70"
            >
              Continue to ID Scan <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Scan Passport */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
          <div className="text-center mb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Passport Authentication {parseInt(booking.guestsCount) > 1 ? `(Guest ${currentGuestIndex + 1} of ${booking.guestsCount})` : ''}
            </h2>
            <p className="text-sm text-slate-500">Position Document in Frame</p>
          </div>
          
          <div className="relative aspect-[3/2] max-w-lg mx-auto bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden mb-2 w-full">
            {guestsDetails[currentGuestIndex]?.photoBase64 ? (
              <img src={`data:image/jpeg;base64,${guestsDetails[currentGuestIndex].photoBase64}`} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                {/* @ts-ignore */}
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "environment" }}
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                {/* Overlay Guide */}
                <div className="absolute inset-x-0 h-0.5 bg-blue-500 shadow-[0_0_10px_#3B82F6] top-1/2 pointer-events-none z-10"></div>
              </>
            )}
            
            {/* Show extracted details overlay if we have them */}
            {guestsDetails[currentGuestIndex]?.fullName && (
              <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur p-3 text-sm flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800">{guestsDetails[currentGuestIndex].fullName}</span>
                  <span className="text-xs font-bold text-slate-500">{guestsDetails[currentGuestIndex].nationality}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Pass: {guestsDetails[currentGuestIndex].passportNumber}</span>
                  <span>DOB: {guestsDetails[currentGuestIndex].dob}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                if (currentGuestIndex > 0) {
                  setCurrentGuestIndex(prev => prev - 1);
                } else {
                  setStep(1);
                }
              }}
              className="py-3 px-6 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            {(guestsDetails[currentGuestIndex] as any)?.existingPhotoUrl && (
              <button
                onClick={() => {
                  const totalGuests = parseInt(booking.guestsCount) || 1;
                  if (currentGuestIndex + 1 < totalGuests) {
                    setCurrentGuestIndex(prev => prev + 1);
                    setGuestsDetails(prev => {
                       if (prev.length <= currentGuestIndex + 1) return [...prev, {}];
                       return prev;
                    });
                  } else {
                    setStep(3);
                  }
                }}
                className="py-3 px-6 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold hover:bg-emerald-100 transition-colors whitespace-nowrap"
              >
                Keep Existing
              </button>
            )}
            <button
              onClick={guestsDetails[currentGuestIndex]?.photoBase64 ? retakePassport : capturePassport}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-md shadow-blue-200 transition-colors w-full sm:w-auto disabled:opacity-70"
            >
              {isProcessing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              {isProcessing ? 'Analyzing...' : (guestsDetails[currentGuestIndex]?.photoBase64 ? 'Retake Passport' : 'Capture Passport')}
            </button>
            <div className="text-slate-400 text-sm">or</div>
            <label className={`flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-lg font-bold transition-colors w-full sm:w-auto ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}`}>
              <input type="file" accept="image/*" onChange={handleManualScan} disabled={isProcessing} className="hidden" />
              Upload Image
            </label>
            
            {guestsDetails[currentGuestIndex]?.photoBase64 && (
              <button
                onClick={() => {
                  const totalGuests = parseInt(booking.guestsCount) || 1;
                  if (currentGuestIndex + 1 < totalGuests) {
                    setCurrentGuestIndex(prev => prev + 1);
                    setGuestsDetails(prev => {
                       if (prev.length <= currentGuestIndex + 1) return [...prev, {}];
                       return prev;
                    });
                  } else {
                    setStep(3);
                  }
                }}
                className="py-3 px-6 bg-emerald-600 border border-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap ml-auto"
              >
                {parseInt(booking.guestsCount) > 1 && currentGuestIndex + 1 < parseInt(booking.guestsCount) ? 'Next Guest' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Questionnaire */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
          <div className="mb-4 border-b border-slate-100 pb-4 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Guest Profiles</h2>
            {guestsDetails.map((guest, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 bg-slate-50 border border-slate-200 p-3 rounded-lg relative">
                {parseInt(booking.guestsCount) > 1 && (
                  <div className="absolute -top-3 -left-3 w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 border border-white">
                    {idx + 1}
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Full Name</p>
                  <input 
                    type="text" 
                    value={guest.fullName || ''} 
                    onChange={e => {
                      const newGuests = [...guestsDetails];
                      newGuests[idx] = { ...newGuests[idx], fullName: e.target.value };
                      setGuestsDetails(newGuests);
                    }}
                    className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" 
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Nationality</p>
                  <input 
                    type="text" 
                    value={guest.nationality || ''} 
                    onChange={e => {
                      const newGuests = [...guestsDetails];
                      newGuests[idx] = { ...newGuests[idx], nationality: e.target.value };
                      setGuestsDetails(newGuests);
                    }}
                    className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" 
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Passport No.</p>
                  <input 
                    type="text" 
                    value={guest.passportNumber || ''} 
                    onChange={e => {
                      const newGuests = [...guestsDetails];
                      newGuests[idx] = { ...newGuests[idx], passportNumber: e.target.value };
                      setGuestsDetails(newGuests);
                    }}
                    className="w-full text-sm font-bold font-mono text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" 
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">DOB</p>
                  <input 
                    type="text" 
                    value={guest.dob || ''} 
                    onChange={e => {
                      const newGuests = [...guestsDetails];
                      newGuests[idx] = { ...newGuests[idx], dob: e.target.value };
                      setGuestsDetails(newGuests);
                    }}
                    className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" 
                  />
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Upsell Discovery Quiz</h3>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">What is your next destination in Bali?</label>
              <input
                type="text"
                placeholder="e.g., Ubud, Seminyak, Uluwatu, or Airport"
                value={answers.nextDestination}
                onChange={e => setAnswers({...answers, nextDestination: e.target.value})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">Are you celebrating a special occasion during this stay?</label>
              <input
                type="text"
                placeholder="e.g., Anniversary, Birthday, Honeymoon"
                value={answers.celebration}
                onChange={e => setAnswers({...answers, celebration: e.target.value})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">What are you most interested in exploring locally?</label>
              <input
                type="text"
                placeholder="e.g., Fine dining, Cultural tours, Wellness & Spa"
                value={answers.interests}
                onChange={e => setAnswers({...answers, interests: e.target.value})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">Any dietary preferences or allergies?</label>
              <input
                type="text"
                placeholder="e.g., Vegan, Gluten-free, No seafood"
                value={answers.dietary}
                onChange={e => setAnswers({...answers, dietary: e.target.value})}
                className="w-full px-3 py-2 text-sm bg-white rounded border border-blue-200 text-blue-900 placeholder:text-blue-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCompleteQuestionnaire}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors disabled:opacity-70"
            >
              {isProcessing ? 'Analyzing...' : 'Generate Profile'}
              {!isProcessing && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Upsell */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-700 mb-1">Profile Generated</h2>
            <p className="text-xs text-slate-500">Review the guest details and identified upsell opportunities before finalizing.</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-800 mb-2 flex items-center gap-2">
              <span className="text-lg">✨</span> AI Upsell Recommendations
            </h3>
            <div className="text-sm text-blue-900 font-medium">
              {upsellData ? (
                <div className="space-y-2">
                  {Object.entries(upsellData).map(([name, proposal]) => (
                    <div key={name} className="flex gap-2">
                      <span className="font-bold text-slate-700">{name}:</span>
                      <span>{String(proposal)}</span>
                    </div>
                  ))}
                </div>
              ) : "No specific upsell opportunities identified."}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={isProcessing}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors disabled:opacity-70"
            >
              {isProcessing ? 'Saving...' : 'Complete Check-In'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
