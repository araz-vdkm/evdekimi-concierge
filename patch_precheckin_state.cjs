const fs = require('fs');
let code = fs.readFileSync('src/components/PreCheckInFlow.tsx', 'utf8');

// Add states
code = code.replace(
  "const [maintenanceNeeded, setMaintenanceNeeded] = useState(false);",
  `const [maintenanceNeeded, setMaintenanceNeeded] = useState(false);
  const [minibarPhoto, setMinibarPhoto] = useState<string | null>(null);
  const [minibarConsumed, setMinibarConsumed] = useState<Record<string, number>>({});
  const [activeMinibarCamera, setActiveMinibarCamera] = useState(false);`
);

// Add step to navigation
code = code.replace(
  "{[...STEPS_CONFIG, { id: 'signoff', title: 'Sign-Off', icon: CheckCircle2 }].map((s, idx) => {",
  "{[...STEPS_CONFIG, { id: 'minibar', title: 'Minibar', icon: Coffee }, { id: 'signoff', title: 'Sign-Off', icon: CheckCircle2 }].map((s, idx) => {"
);

// Fix button logic
code = code.replace(
  "if (step === STEPS_CONFIG.length) return signature.trim().length > 2;",
  "if (step === STEPS_CONFIG.length) return minibarPhoto !== null;\n    if (step === STEPS_CONFIG.length + 1) return signature.trim().length > 2;"
);

// Fix total steps logic
code = code.replace(
  "if (step < STEPS_CONFIG.length) setStep(step + 1);",
  "if (step < STEPS_CONFIG.length + 1) setStep(step + 1);"
);

code = code.replace(
  "setStep(STEPS_CONFIG.length)",
  "setStep(STEPS_CONFIG.length + 1)"
);

// handle camera add
const cameraHandler = `
  const handleMinibarPhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setMinibarPhoto(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
`;

code = code.replace(
  "const handleMaintenancePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {",
  cameraHandler + "\n  const handleMaintenancePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {"
);

fs.writeFileSync('src/components/PreCheckInFlow.tsx', code);
console.log("PreCheckInFlow state patched");
