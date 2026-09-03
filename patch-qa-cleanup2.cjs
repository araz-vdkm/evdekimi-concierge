const fs = require('fs');
let code = fs.readFileSync('src/components/QATestingSuite.tsx', 'utf8');

const targetFunc = `  const handleCleanUpTestRecords = async () => {
    setIsCleaningUp(true);
    setCleanupMessage("Scanning and deleting QA test records from database...");
    addLog('[Cleanup] Initiating purge of QA test records (isQATest: true / qa_ prefixes)...', 'info');

    let deleted = 0;
    const collectionsToClean = ['pre_checkin', 'post_checkout', 'guests', 'guest_reg', 'maintenance_tickets', 'minibar', 'survey'];

    for (const col of collectionsToClean) {
      try {
        const snap = await getDocs(collection(db, col));
        const deletePromises: Promise<void>[] = [];
        
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const id = docSnap.id;
          const isQA = data.isQATest === true || 
                       id.toLowerCase().startsWith('qa_') || 
                       (data.bookingId && data.bookingId.toLowerCase().startsWith('qa_')) ||
                       (data.confirmationCode && data.confirmationCode.toLowerCase().startsWith('qa_'));
                       
          if (isQA) {
            deletePromises.push(deleteDoc(doc(db, col, id)).then(() => { deleted++; }));
          }
        });
        
        await Promise.all(deletePromises);
      } catch (e) {
        addLog(\`[Cleanup] Error cleaning up collection \${col}: \${(e as any).message}\`, 'error');
      }
    }
    
    // Also dispatch an event to clear LocalStorage caches for QA tests
    window.dispatchEvent(new Event('refresh-data'));

    setCleanupMessage(\`QA test records successfully cleaned up (\${deleted} records).\`);
    addLog(\`[Cleanup] Completed cleanup of test artifacts (\${deleted} removed).\`, 'success');
    setTimeout(() => {
      setIsCleaningUp(false);
      setCleanupMessage(null);
    }, 3000);
  };`;

const newFunc = `  const handleCleanUpTestRecords = async () => {
    setIsCleaningUp(true);
    setCleanupMessage("Scanning and deleting QA test records from database...");
    addLog('[Cleanup] Initiating purge of QA test records (isQATest: true / qa_ prefixes)...', 'info');

    let deleted = 0;
    const collectionsToClean = ['pre_checkin', 'post_checkout', 'guests', 'guest_reg', 'maintenance_tickets', 'minibar', 'survey'];

    for (const col of collectionsToClean) {
      try {
        const snap = await getDocs(collection(db, col));
        const deletePromises: Promise<void>[] = [];
        
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const id = docSnap.id;
          const isQA = data.isQATest === true || 
                       id.toLowerCase().startsWith('qa_') || 
                       (data.bookingId && data.bookingId.toLowerCase().startsWith('qa_')) ||
                       (data.confirmationCode && data.confirmationCode.toLowerCase().startsWith('qa_'));
                       
          if (isQA) {
            deletePromises.push(deleteRecord(col, id).then(() => { deleted++; }));
          }
        });
        
        await Promise.all(deletePromises);
      } catch (e) {
        addLog(\`[Cleanup] Error cleaning up collection \${col}: \${(e as any).message}\`, 'error');
      }
    }
    
    // Attempt IndexedDB cleanup for guests
    try {
      const { get: idbGet, set: idbSet } = await import('idb-keyval');
      const localSaved = await idbGet("concierge_registered_guests");
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(g => {
            const gid = g.id || g.passportNumber || \`\${g.fullName}_\${g.unitName}_\${g.checkInDate}\`;
            return !(g.isQATest === true || gid.toLowerCase().startsWith('qa_'));
          });
          await idbSet("concierge_registered_guests", JSON.stringify(filtered));
        }
      }
    } catch (e) {}

    // Also dispatch an event to clear LocalStorage caches for QA tests
    window.dispatchEvent(new Event('refresh-data'));

    setCleanupMessage(\`QA test records successfully cleaned up (\${deleted} records).\`);
    addLog(\`[Cleanup] Completed cleanup of test artifacts (\${deleted} removed).\`, 'success');
    setTimeout(() => {
      setIsCleaningUp(false);
      setCleanupMessage(null);
    }, 3000);
  };`;

if(code.includes(targetFunc)) {
  code = code.replace(targetFunc, newFunc);
  fs.writeFileSync('src/components/QATestingSuite.tsx', code);
  console.log("Replaced handleCleanUpTestRecords successfully.");
} else {
  console.log("Could not find handleCleanUpTestRecords target string.");
}
