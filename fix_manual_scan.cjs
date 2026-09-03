const fs = require('fs');
let content = fs.readFileSync('src/components/CheckInFlow.tsx', 'utf8');

content = content.replace(
  /  const handleManualScan = \(e: React.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?reader\.readAsDataURL\(file\);\n  \};/,
  `  const handleManualScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressedResult = await compressImage(reader.result as string, 800, 800);
        const base64String = compressedResult.split(',')[1];
        
        const token = await getAccessToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch('/api/analyze-passport', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
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
        const fallbackGuest = { photoBase64: (await compressImage(reader.result as string, 800, 800)).split(',')[1], status: 'In Queue' };
        setGuestsDetails(prev => {
          const updated = [...prev];
          updated[currentGuestIndex] = { ...updated[currentGuestIndex], ...fallbackGuest };
          return updated;
        });
      } finally {
        setIsProcessing(false);
        e.target.value = '';
        const totalGuests = parseInt(booking.guestsCount) || 1;
        if (currentGuestIndex + 1 < totalGuests) {
          setCurrentGuestIndex(prev => prev + 1);
          setGuestsDetails(prev => {
             if (prev.length <= currentGuestIndex + 1) {
                return [...prev, {}];
             }
             return prev;
          });
        } else {
          setStep(3);
        }
      }
    };
    reader.readAsDataURL(file);
  };`
);

fs.writeFileSync('src/components/CheckInFlow.tsx', content, 'utf8');
