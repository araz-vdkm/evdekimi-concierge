const fs = require('fs');
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
  const [isProcessing, setIsProcessing] = useState(false);`;

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

code = code.replace(initMatch, initReplace);

const saveMatch = `      let processedSignature = null;
      if (report.signature) {
        const compSig = await compressImage(report.signature, 600, 300, 0.8);
        processedSignature = await uploadImageToStorage(compSig, \`reports/post_checkout/\${bookingId}/signature.jpg\`);
      }
      
      let processedMinibar = null;
      if (report.minibarPhoto) {
        const compMini = await compressImage(report.minibarPhoto, 1200, 1200, 0.85);
        processedMinibar = await uploadImageToStorage(compMini, \`reports/post_checkout/\${bookingId}/minibar.jpg\`);
      }
      
      await saveRecord('post_checkout', bookingId, {
        ...report,
        data: processedData,
        signature: processedSignature,
        minibarPhoto: processedMinibar
      });`;

const saveReplace = `      let processedSignature = existingSignature;
      if (report.signature && report.signature !== existingSignature) {
        const compSig = await compressImage(report.signature, 600, 300, 0.8);
        processedSignature = await uploadImageToStorage(compSig, \`reports/post_checkout/\${bookingId}/signature.jpg\`);
      }
      
      let processedMinibar = report.minibarPhoto;
      if (report.minibarPhoto && report.minibarPhoto.startsWith('data:image')) {
        const compMini = await compressImage(report.minibarPhoto, 1200, 1200, 0.85);
        processedMinibar = await uploadImageToStorage(compMini, \`reports/post_checkout/\${bookingId}/minibar.jpg\`);
      }
      
      await saveRecord('post_checkout', bookingId, {
        ...report,
        data: processedData,
        signature: processedSignature,
        minibarPhoto: processedMinibar,
        lastEditedAt: new Date().toISOString()
      });`;

code = code.replace(saveMatch, saveReplace);
fs.writeFileSync('src/components/PostCheckOutFlow.tsx', code);
console.log('PostCheckOut patched');
