const fs = require('fs');

function patchPreCheckIn() {
  let code = fs.readFileSync('src/components/PreCheckInFlow.tsx', 'utf8');

  const initMatch = `export default function PreCheckInFlow({ onComplete, initialBooking }: PreCheckInFlowProps) {
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<Record<string, SectionData>>({
    exterior: {},
    indoor: {},
    bedroom: {},
    bathroom: {}
  });
  
  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [signature, setSignature] = useState('');
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    if (initialBooking?.id) {
      const existing = localStorage.getItem('pre_checkin_' + initialBooking.id);
      if (existing && existing.startsWith('{')) {
        try {
          const parsed = JSON.parse(existing);
          if (parsed.data) setData(parsed.data);
          if (parsed.maintenanceNeeded !== undefined) setMaintenanceNeeded(parsed.maintenanceNeeded);
          if (parsed.maintenanceNotes) setMaintenanceNotes(parsed.maintenanceNotes);
          if (parsed.signature) setExistingSignature(parsed.signature);
        } catch(e) {}
      }
    }
  }, [initialBooking?.id]);`;

  const initReplace = `export default function PreCheckInFlow({ onComplete, initialBooking }: PreCheckInFlowProps) {
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<Record<string, SectionData>>({
    exterior: {},
    indoor: {},
    bedroom: {},
    bathroom: {}
  });
  
  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [signature, setSignature] = useState('');
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Load initial data (Draft preferred, then existing report)
  useEffect(() => {
    if (initialBooking?.id) {
      const draft = localStorage.getItem('draft_pre_checkin_' + initialBooking.id);
      const existing = localStorage.getItem('pre_checkin_' + initialBooking.id);
      
      let toLoad = null;
      if (draft && draft.startsWith('{')) {
        toLoad = draft;
      } else if (existing && existing.startsWith('{')) {
        toLoad = existing;
      }
      
      if (toLoad) {
        try {
          const parsed = JSON.parse(toLoad);
          if (parsed.data) setData(parsed.data);
          if (parsed.maintenanceNeeded !== undefined) setMaintenanceNeeded(parsed.maintenanceNeeded);
          if (parsed.maintenanceNotes) setMaintenanceNotes(parsed.maintenanceNotes);
          if (parsed.signature) {
            setSignature(parsed.signature);
            setExistingSignature(parsed.signature);
          }
        } catch(e) {}
      }
    }
  }, [initialBooking?.id]);

  // Auto-save mechanism
  useEffect(() => {
    if (initialBooking?.id) {
      const draftData = {
        data,
        maintenanceNeeded,
        maintenanceNotes,
        signature
      };
      localStorage.setItem('draft_pre_checkin_' + initialBooking.id, JSON.stringify(draftData));
    }
  }, [data, maintenanceNeeded, maintenanceNotes, signature, initialBooking?.id]);`;

  code = code.replace(initMatch, initReplace);

  const saveMatch = `      await saveRecord('pre_checkin', bookingId, {
        ...report,
        data: processedData,
        signature: processedSignature,
        lastEditedAt: new Date().toISOString()
      });

      alert('Inspection Report submitted successfully! Status updated to Inspected.');`;

  const saveReplace = `      await saveRecord('pre_checkin', bookingId, {
        ...report,
        data: processedData,
        signature: processedSignature,
        lastEditedAt: new Date().toISOString()
      });

      if (initialBooking?.id) {
        localStorage.removeItem('draft_pre_checkin_' + initialBooking.id);
      }

      alert('Inspection Report submitted successfully! Status updated to Inspected.');`;

  code = code.replace(saveMatch, saveReplace);
  fs.writeFileSync('src/components/PreCheckInFlow.tsx', code);
}

function patchPostCheckOut() {
  let code = fs.readFileSync('src/components/PostCheckOutFlow.tsx', 'utf8');

  const initMatch = `export default function PostCheckOutFlow({ onComplete, initialBooking }: PostCheckOutFlowProps) {
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<Record<string, SectionData>>({
    indoor: {},
    amenities: {},
    bathroom_outdoor: {}
  });
  
  const [minibarPhoto, setMinibarPhoto] = useState<string | null>(null);
  const [minibarConsumed, setMinibarConsumed] = useState<Record<string, number>>({});
  
  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    if (initialBooking?.id) {
      const existing = localStorage.getItem('post_checkout_' + initialBooking.id);
      if (existing && existing.startsWith('{')) {
        try {
          const parsed = JSON.parse(existing);
          if (parsed.data) setData(parsed.data);
          if (parsed.minibarPhoto) setMinibarPhoto(parsed.minibarPhoto);
          if (parsed.minibarConsumed) {
            const consumedMap: Record<string, number> = {};
            parsed.minibarConsumed.forEach((item: any) => {
              consumedMap[item.name] = item.qtyConsumed;
            });
            setMinibarConsumed(consumedMap);
          }
          if (parsed.maintenanceNeeded !== undefined) setMaintenanceNeeded(parsed.maintenanceNeeded);
          if (parsed.maintenanceNotes) setMaintenanceNotes(parsed.maintenanceNotes);
          if (parsed.signature) setExistingSignature(parsed.signature);
        } catch(e) {}
      }
    }
  }, [initialBooking?.id]);`;

  const initReplace = `export default function PostCheckOutFlow({ onComplete, initialBooking }: PostCheckOutFlowProps) {
  const [step, setStep] = useState<number>(0);
  const [data, setData] = useState<Record<string, SectionData>>({
    indoor: {},
    amenities: {},
    bathroom_outdoor: {}
  });
  
  const [minibarPhoto, setMinibarPhoto] = useState<string | null>(null);
  const [minibarConsumed, setMinibarConsumed] = useState<Record<string, number>>({});
  
  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Load initial data (Draft preferred, then existing report)
  useEffect(() => {
    if (initialBooking?.id) {
      const draft = localStorage.getItem('draft_post_checkout_' + initialBooking.id);
      const existing = localStorage.getItem('post_checkout_' + initialBooking.id);
      
      let toLoad = null;
      if (draft && draft.startsWith('{')) {
        toLoad = draft;
      } else if (existing && existing.startsWith('{')) {
        toLoad = existing;
      }
      
      if (toLoad) {
        try {
          const parsed = JSON.parse(toLoad);
          if (parsed.data) setData(parsed.data);
          if (parsed.minibarPhoto) setMinibarPhoto(parsed.minibarPhoto);
          if (parsed.minibarConsumed) {
            // For draft it might be object format, for existing it might be array format.
            if (Array.isArray(parsed.minibarConsumed)) {
              const consumedMap: Record<string, number> = {};
              parsed.minibarConsumed.forEach((item: any) => {
                consumedMap[item.name] = item.qtyConsumed;
              });
              setMinibarConsumed(consumedMap);
            } else {
              setMinibarConsumed(parsed.minibarConsumed);
            }
          }
          if (parsed.maintenanceNeeded !== undefined) setMaintenanceNeeded(parsed.maintenanceNeeded);
          if (parsed.maintenanceNotes) setMaintenanceNotes(parsed.maintenanceNotes);
          if (parsed.signature) {
            setSignature(parsed.signature);
            setExistingSignature(parsed.signature);
          }
        } catch(e) {}
      }
    }
  }, [initialBooking?.id]);

  // Auto-save mechanism
  useEffect(() => {
    if (initialBooking?.id) {
      const draftData = {
        data,
        minibarPhoto,
        minibarConsumed,
        maintenanceNeeded,
        maintenanceNotes,
        signature
      };
      localStorage.setItem('draft_post_checkout_' + initialBooking.id, JSON.stringify(draftData));
    }
  }, [data, minibarPhoto, minibarConsumed, maintenanceNeeded, maintenanceNotes, signature, initialBooking?.id]);`;

  code = code.replace(initMatch, initReplace);

  const saveMatch = `      await saveRecord('post_checkout', bookingId, {
        ...report,
        data: processedData,
        signature: processedSignature,
        minibarPhoto: processedMinibar,
        lastEditedAt: new Date().toISOString()
      });

      alert('Post Check-Out Report submitted successfully! Status updated to Cleared.');`;

  const saveReplace = `      await saveRecord('post_checkout', bookingId, {
        ...report,
        data: processedData,
        signature: processedSignature,
        minibarPhoto: processedMinibar,
        lastEditedAt: new Date().toISOString()
      });

      if (initialBooking?.id) {
        localStorage.removeItem('draft_post_checkout_' + initialBooking.id);
      }

      alert('Post Check-Out Report submitted successfully! Status updated to Cleared.');`;

  code = code.replace(saveMatch, saveReplace);
  fs.writeFileSync('src/components/PostCheckOutFlow.tsx', code);
}

try {
  patchPreCheckIn();
  patchPostCheckOut();
  console.log('Autosave patched');
} catch (e) {
  console.error(e);
}
