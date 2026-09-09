import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, where } from "firebase/firestore";
import { db } from "./auth";

const withTimeout = <T>(promise: Promise<T>, ms: number = 15000): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeoutPromise
  ]);
};

export const saveRecord = async (collectionName: string, id: string, data: any) => {
  try {
    const setDocPromise = setDoc(doc(db, collectionName, id), {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    await withTimeout(setDocPromise, 15000);

    // Also update local storage for instant UI updates
    try {
      // Create a shallow copy to strip large base64 payloads to avoid quota errors
      let cacheData = data;
      if (collectionName === 'pre_checkin' || collectionName === 'post_checkout') {
          cacheData = JSON.parse(JSON.stringify(data));
          if (cacheData.data) {
             Object.keys(cacheData.data).forEach(sec => {
                Object.keys(cacheData.data[sec]).forEach(item => {
                   if (cacheData.data[sec][item].photos) {
                      cacheData.data[sec][item].photos = cacheData.data[sec][item].photos.map((p: any) => 
                         (typeof p === 'string' && p.startsWith('data:image')) ? 'local-cache-omitted' : p
                      );
                   }
                });
             });
          }
          if (typeof cacheData.signature === 'string' && cacheData.signature.startsWith('data:image')) {
             cacheData.signature = 'local-cache-omitted';
          }
      }
      if (collectionName === 'users' && cacheData.photoBase64) {
          cacheData.photoBase64 = 'local-cache-omitted';
      }
      
      try {
         localStorage.setItem(`${collectionName}_${id}`, JSON.stringify(cacheData));
      } catch(e) {
         console.warn("Storage quota exceeded even after scrubbing, skipping local cache.");
      }
      if (collectionName === 'guest_reg') {
         localStorage.setItem(`guest_reg_${id}`, 'true');
      }
    } catch (e) {
      console.warn('Local storage quota exceeded or unavailable');
    }

    // Trigger local events so all views update
    try {
      window.dispatchEvent(new Event('local-storage-synced'));
      window.dispatchEvent(new Event('refresh-data'));
    } catch (e) {}

  } catch (err) {
    console.warn("Firestore save skipped/timed out, trying compact fallback:", err);
    if (collectionName === 'users') {
      throw new Error("Critical: Failed to save user data to database.");
    }

    // Fallback: If document size or network caused failure, strip large image data and retry setDoc once
    try {
      const scrubbed = JSON.parse(JSON.stringify(data));
      if (scrubbed.data) {
        Object.keys(scrubbed.data).forEach(sec => {
          Object.keys(scrubbed.data[sec]).forEach(item => {
            if (scrubbed.data[sec][item].photos) {
              scrubbed.data[sec][item].photos = scrubbed.data[sec][item].photos.map((p: any) =>
                (typeof p === 'string' && p.startsWith('data:image') && p.length > 50000) ? 'photo-too-large' : p
              );
            }
          });
        });
      }
      await withTimeout(setDoc(doc(db, collectionName, id), {
        ...scrubbed,
        updatedAt: new Date().toISOString()
      }, { merge: true }), 10000);
      console.log(`Saved compact fallback record to Firestore for ${collectionName}/${id}`);
    } catch (retryErr) {
      console.warn(`Firestore compact retry failed for ${collectionName}/${id}:`, retryErr);
    }

    // Continue with local storage
    try {
      localStorage.setItem(`${collectionName}_${id}`, JSON.stringify(data));
      if (collectionName === 'guest_reg') {
        localStorage.setItem(`guest_reg_${id}`, 'true');
      }
      window.dispatchEvent(new Event('local-storage-synced'));
    } catch (e) {
      console.warn('Local storage quota exceeded or unavailable');
    }
  }
};

export const getRecord = async (collectionName: string, id: string) => {
  try {
    const getDocPromise = getDoc(doc(db, collectionName, id));
    const docSnap = await withTimeout(getDocPromise, 5000);
    
    if (docSnap && docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.warn("Firestore read skipped/timed out, using local state:", err);
  }
  return null;
};

export const deleteRecord = async (collectionName: string, id: string) => {
  try {
    const deleteDocPromise = deleteDoc(doc(db, collectionName, id));
    await withTimeout(deleteDocPromise, 5000);
  } catch (err) {
    console.warn(`Firestore delete failed for ${collectionName}/${id}:`, err);
  }
  try {
    localStorage.removeItem(`${collectionName}_${id}`);
    if (collectionName === 'guest_reg') {
      localStorage.removeItem(`guest_reg_${id}`);
    }
  } catch (e) {
    console.warn('Local storage delete failed:', e);
  }
};

export const syncAllRecordsToLocal = async () => {
  const collectionsToSync = ['pre_checkin', 'post_checkout', 'guest_reg', 'survey', 'guests', 'maintenance_tickets'];
  
  let remoteGuests = [];

  for (const col of collectionsToSync) {
    try {
      const getDocsPromise = getDocs(collection(db, col));
      const querySnapshot = await withTimeout(getDocsPromise, 45000);
      
      if (querySnapshot && querySnapshot.forEach) {
        querySnapshot.forEach((docSnap: any) => {
          const id = docSnap.id;
          const remoteData = docSnap.data();
          
          if (col === 'guest_reg') {
            localStorage.setItem(`guest_reg_${id}`, 'true');
            if (remoteData.confirmationCode) localStorage.setItem(`guest_reg_${remoteData.confirmationCode}`, 'true');
            if (remoteData.bookingId) localStorage.setItem(`guest_reg_${remoteData.bookingId}`, 'true');
            if (remoteData.guestName) {
              localStorage.setItem(`guest_reg_name_${remoteData.guestName.toLowerCase().trim()}`, 'true');
            }
            if (remoteData.unitName && remoteData.checkInDate) {
              localStorage.setItem(`guest_reg_unit_${remoteData.unitName}_${remoteData.checkInDate}`, 'true');
            }
          } else if (col === 'survey') {
            const existingRaw = localStorage.getItem('sent_surveys') || '{}';
            try {
              const surveys = JSON.parse(existingRaw);
              surveys[id] = true;
              if (remoteData.confirmationCode) surveys[remoteData.confirmationCode] = true;
              if (remoteData.bookingId) surveys[remoteData.bookingId] = true;
              if (remoteData.guestEmail) surveys[remoteData.guestEmail] = true;
              if (remoteData.guestName) surveys[remoteData.guestName.toLowerCase().trim()] = true;
              localStorage.setItem('sent_surveys', JSON.stringify(surveys));
            } catch (e) {}
          } else if (col === 'guests') {
             remoteGuests.push(remoteData);
             if (remoteData.bookingId) localStorage.setItem(`guest_reg_${remoteData.bookingId}`, 'true');
             if (remoteData.confirmationCode) localStorage.setItem(`guest_reg_${remoteData.confirmationCode}`, 'true');
             if (remoteData.fullName) localStorage.setItem(`guest_reg_name_${remoteData.fullName.toLowerCase().trim()}`, 'true');
          } else {
            const key = `${col}_${id}`;
            const existingRaw = localStorage.getItem(key);
            let merged = remoteData;
            if (existingRaw) {
              try {
                const localData = JSON.parse(existingRaw);
                merged = {
                  ...localData,
                  ...remoteData,
                };
                if (localData.data && (!remoteData.data || Object.keys(remoteData.data).length === 0)) {
                  merged.data = localData.data;
                }
              } catch (e) {}
            }
            localStorage.setItem(key, JSON.stringify(merged));
            
            // Also store aliases for instant cross-device matching
            if (remoteData.confirmationCode) {
              try { localStorage.setItem(`${col}_${remoteData.confirmationCode}`, JSON.stringify(merged)); } catch(e) {}
            }
            if (remoteData.bookingId && remoteData.bookingId !== id) {
              try { localStorage.setItem(`${col}_${remoteData.bookingId}`, JSON.stringify(merged)); } catch(e) {}
            }
            if (remoteData.guestName) {
              try { localStorage.setItem(`${col}_name_${remoteData.guestName.toLowerCase().trim()}`, JSON.stringify(merged)); } catch(e) {}
            }
            if (remoteData.unitName && (remoteData.checkInDate || remoteData.checkOutDate)) {
              const dKey = remoteData.checkInDate || remoteData.checkOutDate;
              try { localStorage.setItem(`${col}_unit_${remoteData.unitName}_${dKey}`, JSON.stringify(merged)); } catch(e) {}
            }
          }
        });
      }
    } catch (colErr) {
      console.warn(`[Sync] Notice for ${col}: using offline/cached local data (${colErr instanceof Error ? colErr.message : colErr})`);
    }
  }
  
  // Merge remote guests into local array
  if (remoteGuests.length > 0) {
      try {
          const localSaved = (await idbGet("concierge_registered_guests"));
          let localGuests = [];
          if (localSaved) {
              try { localGuests = JSON.parse(localSaved); } catch(e) {}
          }
          
          const existingIds = new Set(localGuests.map((g: any) => g.id || g.passportNumber || g.fullName));
          remoteGuests.forEach(rg => {
              const identifier = rg.id || rg.passportNumber || rg.fullName;
              if (identifier && !existingIds.has(identifier)) {
                  localGuests.push(rg);
                  existingIds.add(identifier);
              }
          });
          
          await idbSet("concierge_registered_guests", JSON.stringify(localGuests));
      } catch(e) {}
  }
  
  // Notify components that local storage has been updated from remote
  window.dispatchEvent(new Event('local-storage-synced'));
};

/**
 * Purge all operational test data (guest registrations, pre-checkins, post-checkouts,
 * surveys, guest profiles, maintenance tickets) from Firestore and LocalStorage.
 * Preserves user accounts and credentials.
 */
export const purgeAllOperationalData = async (): Promise<{ deletedCounts: Record<string, number>; totalDeleted: number }> => {
  const collectionsToPurge = ['pre_checkin', 'post_checkout', 'guest_reg', 'survey', 'guests', 'maintenance_tickets', 'minibar', 'activity_logs', 'upsell_items'];
  const deletedCounts: Record<string, number> = {};
  let totalDeleted = 0;

  for (const col of collectionsToPurge) {
    deletedCounts[col] = 0;
    try {
      const getDocsPromise = getDocs(collection(db, col));
      const snapshot = await withTimeout(getDocsPromise, 8000).catch(() => null);
      if (snapshot && snapshot.docs) {
        const deletePromises = snapshot.docs.map(async (docSnap) => {
          try {
            await deleteDoc(doc(db, col, docSnap.id));
            return 1;
          } catch (e) {
            console.warn(`Failed to delete doc ${docSnap.id} from ${col}:`, e);
            return 0;
          }
        });
        const results = await Promise.all(deletePromises);
        const colDeleted = results.reduce((a, b) => a + b, 0);
        deletedCounts[col] = colDeleted;
        totalDeleted += colDeleted;
      }
    } catch (err) {
      console.warn(`Error deleting documents from collection ${col}:`, err);
    }
  }

  // Clear relevant local storage keys
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('pre_checkin_') ||
        key.startsWith('post_checkout_') ||
        key.startsWith('guest_reg_') ||
        key.startsWith('survey_') ||
        key.startsWith('draft_pre_checkin') ||
        key.startsWith('draft_post_checkout') ||
        key.startsWith('draft_guest_reg') ||
        key.startsWith('draft_maintenance') ||
        key.startsWith('maintenance_tickets_') ||
                key === 'sent_surveys'
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    await idbDel('concierge_registered_guests');
  } catch (e) {
    console.warn("Error cleaning local storage keys:", e);
  }

  // Notify UI
  try {
    window.dispatchEvent(new Event('local-storage-synced'));
    window.dispatchEvent(new Event('refresh-data'));
  } catch (e) {}

  return { deletedCounts, totalDeleted };
};
export const deleteRecordWithAliases = async (collectionName: string, id: string, bookingId?: string) => {
  try {
    const q = query(collection(db, collectionName), where('bookingId', '==', bookingId || id));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, collectionName, d.id)));
    
    // Also delete by direct ID just in case it doesn't have the bookingId field
    deletePromises.push(deleteDoc(doc(db, collectionName, id)));
    
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn(`Firestore delete failed for ${collectionName}/${id}:`, err);
  }

  // Best-effort cleanup of local caches so a stale copy can't repopulate the view
  try {
    localStorage.removeItem(`${collectionName}_${id}`);
    if (bookingId) localStorage.removeItem(`${collectionName}_${bookingId}`);
  } catch (e) {}
};

/**
 * Merges `fields` into every document in `collectionName` whose own id is
 * `bookingId`, plus every document whose `bookingId` field equals it.
 *
 * pre_checkin/post_checkout reports get saved under several document ids for
 * the same booking (the bookingId itself, the confirmation code, a reservation
 * id, name_<guestName>, unit_<unitName>_<date> — see PostCheckOutFlow /
 * PreCheckInFlow), all with identical content. A real hard-delete of one
 * field (e.g. clearing minibarConsumed when a Minibar record is deleted) has
 * to land on every one of those alias copies, or the un-cleared aliases keep
 * the old data alive and it can resurface the next time they're read.
 */
export const clearFieldsWithAliases = async (collectionName: string, bookingId: string, fields: Record<string, any>) => {
  if (!bookingId) return;
  const idsToUpdate = new Set<string>([bookingId]);
  try {
    const q = query(collection(db, collectionName), where('bookingId', '==', bookingId));
    const snapshot = await withTimeout(getDocs(q), 8000);
    snapshot.docs.forEach(d => idsToUpdate.add(d.id));
  } catch (err) {
    console.warn(`Failed to look up alias docs for ${collectionName}/${bookingId}:`, err);
  }

  await Promise.all(Array.from(idsToUpdate).map(async (id) => {
    try {
      const existing = await getRecord(collectionName, id);
      if (existing) {
        await saveRecord(collectionName, id, { ...existing, ...fields });
      }
    } catch (e) {
      console.warn(`Failed to clear fields on ${collectionName}/${id}:`, e);
    }
  }));
};
