const fs = require('fs');
let content = fs.readFileSync('src/components/CheckInFlow.tsx', 'utf8');

content = content.replace(
  /const capturePassport = useCallback\(async \(\) => \{[\s\S]*?\}, \[webcamRef, currentGuestIndex, booking.guestsCount\]\);/,
  `const capturePassport = useCallback(async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setIsProcessing(true);
    const base64Data = imageSrc.split(',')[1];
    
    try {
      const token = await getAccessToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch('/api/analyze-passport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
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
  }, [webcamRef, currentGuestIndex, booking.guestsCount]);`
);

content = content.replace(
  /status: 'Checked In',/,
  "status: guestDetail.status === 'In Queue' ? 'In Queue' : 'Checked In',"
);

content = content.replace(
  /status: guestDetail\.status === 'In Queue' \? 'In Queue' : 'Checked In',/,
  "status: (guestDetail as any).status === 'In Queue' ? 'In Queue' : 'Checked In',"
);

fs.writeFileSync('src/components/CheckInFlow.tsx', content, 'utf8');
