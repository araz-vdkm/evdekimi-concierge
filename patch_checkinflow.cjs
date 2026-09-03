const fs = require('fs');
let code = fs.readFileSync('src/components/CheckInFlow.tsx', 'utf8');

const importMatch = `import React, { useState, useRef, useCallback } from 'react';`;
const importReplace = `import React, { useState, useRef, useCallback, useEffect } from 'react';`;
code = code.replace(importMatch, importReplace);

const initMatch = `export default function CheckInFlow({ spreadsheetId, onComplete, initialBooking }: CheckInFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Scanned Data
  const [guestsDetails, setGuestsDetails] = useState<Partial<Guest & { photoBase64?: string }>[]>([
    { fullName: initialBooking?.guestName || '' }
  ]);
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0);
  
  // Questionnaire Answers
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    celebration: '',
    interests: '',
    dietary: ''
  });
  
  const [booking, setBooking] = useState({
    checkInDate: initialBooking?.checkInDate || new Date().toISOString().split('T')[0],
    checkOutDate: initialBooking?.checkOutDate || '',
    complexName: initialBooking?.complexName || '',
    unitName: initialBooking?.unitName || '',
    guestsCount: '', // Intentionally empty to require manual entry
    contactNumber: '',
    contactEmail: ''
  });`;

const initReplace = `export default function CheckInFlow({ spreadsheetId, onComplete, initialBooking }: CheckInFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Scanned Data
  const [guestsDetails, setGuestsDetails] = useState<Partial<Guest & { photoBase64?: string; existingId?: string }>[]>([
    { fullName: initialBooking?.guestName || '' }
  ]);
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0);
  
  // Questionnaire Answers
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    celebration: '',
    interests: '',
    dietary: ''
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
  
  useEffect(() => {
    if (initialBooking?.id) {
      const localSaved = localStorage.getItem('concierge_registered_guests');
      if (localSaved) {
        try {
          const guests: Guest[] = JSON.parse(localSaved);
          const bookingGuests = guests.filter(g => (g as any).bookingId === initialBooking.id || g.id === initialBooking.id);
          if (bookingGuests.length > 0) {
            setGuestsDetails(bookingGuests.map(g => ({
              ...g,
              existingId: g.id,
              photoBase64: g.photo // Keep original URL if it's already a URL
            })));
            
            // Populate booking data from first guest
            const first = bookingGuests[0];
            setBooking(prev => ({
              ...prev,
              checkInDate: first.checkInDate || prev.checkInDate,
              checkOutDate: first.checkOutDate || prev.checkOutDate,
              complexName: first.complexName || prev.complexName,
              unitName: first.unitName || prev.unitName,
              guestsCount: first.guestsCount?.toString() || bookingGuests.length.toString(),
              contactNumber: first.contactNumber || prev.contactNumber,
              contactEmail: first.contactEmail || prev.contactEmail
            }));
            
            // Infer basic answers
            if (first.purpose?.startsWith('Celebrating')) {
              setAnswers(prev => ({ ...prev, celebration: first.purpose!.replace('Celebrating ', '') }));
            }
          }
        } catch(e) {}
      }
    }
  }, [initialBooking?.id]);`;

code = code.replace(initMatch, initReplace);

const saveMatch = `        const finalGuest = {
          id: crypto.randomUUID(),`;

const saveReplace = `        const finalGuest = {
          id: guestDetail.existingId || crypto.randomUUID(),`;

code = code.replace(saveMatch, saveReplace);
fs.writeFileSync('src/components/CheckInFlow.tsx', code);
console.log('CheckInFlow patched');
