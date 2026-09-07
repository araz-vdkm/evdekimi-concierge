import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import React, { useState, useEffect } from 'react';
import { UserPlus, CheckSquare, ClipboardCheck, LayoutDashboard, LogIn, LogOut, Clock, RefreshCw, Mail, Sparkles, CheckCircle, Wrench, Coffee } from 'lucide-react';
import { getAccessToken, getGoogleToken, googleSignIn, db } from "../lib/auth";
import { saveRecord, syncAllRecordsToLocal } from '../lib/db';
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { isReservationAssignedToUser, resolveReservationProperty, matchesProperty } from '../lib/villaMatcher';

interface HomeProps {
  onSelectView: (view: 'checkin' | 'pre_checkin' | 'post_checkout' | 'dashboard' | 'maintenance' | 'usermanagement' | 'minibar' | 'qatesting', data?: any) => void;
  isAdmin: boolean;
  userRole?: string;
  currentUser?: any;
  canEdit?: boolean;
}


export default function Home({ onSelectView, isAdmin, userRole, currentUser, canEdit = true }: HomeProps) {
  const [connectedConciergeEmail, setConnectedConciergeEmail] = useState<string>(() => {
    return localStorage.getItem("concierge_connected_email") || (localStorage.getItem("googleOAuthToken") ? "concierge@evdekimi.com" : "");
  });

  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [selectedVillaFilter, setSelectedVillaFilter] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'tomorrow'>('all');
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [departures, setDepartures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingBookings, setIsSyncingBookings] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Firestore remote data state for cross-user/cross-device live synchronization
  const [firestorePreReports, setFirestorePreReports] = useState<any[]>([]);
  const [firestorePostReports, setFirestorePostReports] = useState<any[]>([]);
  const [firestoreGuestRegs, setFirestoreGuestRegs] = useState<any[]>([]);
  const [firestoreGuests, setFirestoreGuests] = useState<any[]>([]);
  const [firestoreSurveys, setFirestoreSurveys] = useState<any[]>([]);

  const [surveyModalData, setSurveyModalData] = useState<{
    resId: string;
    guestName: string;
    guestEmail: string;
    complexName: string;
    unitName: string;
    surveyUrl: string;
    subject?: string;
    message?: string;
  } | null>(null);
  const [recipientEmailInput, setRecipientEmailInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sentSurveys, setSentSurveys] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sent_surveys') || '{}');
    } catch {
      return {};
    }
  });

  const processReservations = (reservationsList: any[], syncTime?: string | null) => {
    if (syncTime) setLastSyncTime(syncTime);
    
    // Normalize reservations
    const normalized = (reservationsList || []).map((r: any) => {
      const resolved = resolveReservationProperty(r);
      return {
        ...r,
        complexName: resolved.complexName,
        unitName: resolved.unitName,
        villa: resolved.displayName,
        checkInDate: r.checkInDate || r.checkIn || '',
        checkOutDate: r.checkOutDate || r.checkOut || '',
        id: r.confirmationCode || r.id || ''
      };
    });

    // RBAC: Filter reservations by assigned complexes / units
    const filteredList = normalized.filter(r => isReservationAssignedToUser(r, currentUser));

    // 1. Filter out unconfirmed, canceled, or inquiry reservations
    const confirmedOnly = filteredList.filter((r: any) => {
      const st = (r.status || 'confirmed').toLowerCase().trim();
      return st === 'confirmed' || st === 'active' || st === 'booked';
    });

    // 2. Deduplicate by confirmationCode or ID
    const seenCodes = new Set<string>();
    const activeReservations = confirmedOnly.filter((r: any) => {
      const code = r.confirmationCode || r.id;
      if (code) {
        if (seenCodes.has(code)) return false;
        seenCodes.add(code);
      }
      return true;
    });
    
    setAllReservations(activeReservations);

    const localDate = new Date();
    
    const tYear = localDate.getFullYear();
    const tMonth = String(localDate.getMonth() + 1).padStart(2, '0');
    const tDay = String(localDate.getDate()).padStart(2, '0');
    const todayStr = `${tYear}-${tMonth}-${tDay}`;

    const tomorrow = new Date(localDate);
    tomorrow.setDate(localDate.getDate() + 1);
    const tmYear = tomorrow.getFullYear();
    const tmMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tmDay = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${tmYear}-${tmMonth}-${tmDay}`;

    let arr = activeReservations.filter((r: any) => {
      const ci = r.checkInDate || r.checkIn || '';
      return ci === todayStr || ci === tomorrowStr;
    });

    let dep = activeReservations.filter((r: any) => {
      const co = r.checkOutDate || r.checkOut || '';
      return co === todayStr || co === tomorrowStr;
    });

    setArrivals(arr);
    setDepartures(dep);
  };

  const fetchReservations = async (refresh: boolean = false) => {
    if (refresh) {
      setIsSyncingBookings(true);
    } else {
      setIsLoading(true);
    }

    // Trigger local & remote record sync in the background
    syncAllRecordsToLocal().catch(() => {});

    // 1. Load from localStorage cache first for immediate zero-latency display
    try {
      const savedRes = localStorage.getItem('concierge_cached_reservations');
      const savedTime = localStorage.getItem('concierge_last_sync_time');
      if (savedRes) {
        const parsed = JSON.parse(savedRes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          processReservations(parsed, savedTime);
          if (!refresh) setIsLoading(false);
        }
      }
    } catch(e) {}

    try {
      const token = await getAccessToken().catch(() => 'dummy-token');
      const url = refresh ? `/api/reservations?refresh=true` : `/api/reservations`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, "x-google-oauth-token": getGoogleToken() }
      });
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        const reservationsList = Array.isArray(data) ? data : (data.reservations || data.data || []);
        const syncTime = data.lastSyncTime || new Date().toISOString();

        if (reservationsList.length > 0) {
          localStorage.setItem('concierge_cached_reservations', JSON.stringify(reservationsList));
          localStorage.setItem('concierge_last_sync_time', syncTime);
          processReservations(reservationsList, syncTime);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch reservations (server might be restarting):", err?.message);
    } finally {
      setIsLoading(false);
      if (refresh) setIsSyncingBookings(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    syncAllRecordsToLocal().catch(() => {});
    
    const handleRefresh = () => {
      fetchReservations(true);
      syncAllRecordsToLocal().catch(() => {});
    };
    const handleStorageSync = () => {
      try {
        setSentSurveys(JSON.parse(localStorage.getItem('sent_surveys') || '{}'));
      } catch (e) {}
      // Force a re-render to pick up other localStorage changes (like guest_reg_*)
      setAllReservations(prev => [...prev]);
    };
    
    window.addEventListener('refresh-data', handleRefresh);
    window.addEventListener('local-storage-synced', handleStorageSync);

    // Live real-time Firestore listeners to sync across all users instantly
    let unsubs: (() => void)[] = [];
    try {
      unsubs.push(onSnapshot(collection(db, 'pre_checkin'), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFirestorePreReports(docs);
      }, (e) => console.warn("Notice: Firestore pre_checkin sync", e)));

      unsubs.push(onSnapshot(collection(db, 'post_checkout'), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFirestorePostReports(docs);
      }, (e) => console.warn("Notice: Firestore post_checkout sync", e)));

      unsubs.push(onSnapshot(collection(db, 'guest_reg'), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFirestoreGuestRegs(docs);
      }, (e) => console.warn("Notice: Firestore guest_reg sync", e)));

      unsubs.push(onSnapshot(collection(db, 'guests'), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFirestoreGuests(docs);
      }, (e) => console.warn("Notice: Firestore guests sync", e)));

      unsubs.push(onSnapshot(collection(db, 'survey'), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFirestoreSurveys(docs);
      }, (e) => console.warn("Notice: Firestore survey sync", e)));
    } catch (err) {
      console.warn("Firestore listeners initialization notice:", err);
    }

    // Watchdog: automatically sync reservations every 5 minutes
    const watchdog = setInterval(() => {
      fetchReservations(true);
      syncAllRecordsToLocal().catch(() => {});
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('refresh-data', handleRefresh);
      window.removeEventListener('local-storage-synced', handleStorageSync);
      unsubs.forEach(u => {
        try { u(); } catch(e) {}
      });
      clearInterval(watchdog);
    };
  }, []);

  const isPreCheckInComplete = (res: any, idx: number) => {
    const code = (res.confirmationCode || '').trim();
    const id = (res.id || '').trim();
    const arrKey = `arr-${idx}`;
    const gName = (res.guestName || res.guest?.name || '').toLowerCase().trim();
    const uName = (res.unitName || '').toLowerCase().trim();
    const cName = (res.villa || res.complexName || '').toLowerCase().trim();
    const ciDate = (res.checkInDate || res.checkIn || '').trim();

    // 1. LocalStorage lookup
    const localKeys = [code, id, arrKey, gName && `name_${gName}`, (uName && ciDate) && `unit_${uName}_${ciDate}`].filter(Boolean);
    for (const k of localKeys) {
      const val = localStorage.getItem(`pre_checkin_${k}`);
      if (val === 'true' || (val && val.startsWith('{'))) return true;
    }

    // 2. Real-time Firestore records
    return firestorePreReports.some((r: any) => {
      if (!r) return false;
      const rCode = (r.confirmationCode || r.bookingId || r.id || '').trim();
      const rGName = (r.guestName || r.fullName || '').toLowerCase().trim();
      const rUName = (r.unitName || '').toLowerCase().trim();
      const rCName = (r.complexName || r.villa || '').toLowerCase().trim();
      const rCiDate = (r.checkInDate || '').trim();

      if (code && rCode && (code === rCode || rCode.includes(code) || code.includes(rCode))) return true;
      if (id && rCode && (id === rCode || rCode.includes(id) || id.includes(rCode))) return true;
      if (r.id && (r.id === code || r.id === id || r.id === `pre_checkin_${code}` || r.id === `pre_checkin_${id}`)) return true;
      if (gName && rGName && (gName.includes(rGName) || rGName.includes(gName))) {
        if (!uName || !rUName || uName === rUName || !cName || !rCName || cName === rCName) return true;
      }
      if (uName && rUName && uName === rUName && ciDate && rCiDate && ciDate === rCiDate) return true;
      return false;
    });
  };

  const isGuestRegComplete = (res: any, idx: number) => {
    const code = (res.confirmationCode || '').trim();
    const id = (res.id || '').trim();
    const arrKey = `arr-${idx}`;
    const gName = (res.guestName || res.guest?.name || '').toLowerCase().trim();
    const uName = (res.unitName || '').toLowerCase().trim();
    const cName = (res.villa || res.complexName || '').toLowerCase().trim();
    const ciDate = (res.checkInDate || res.checkIn || '').trim();

    // 1. LocalStorage lookup
    const localKeys = [code, id, arrKey, gName && `name_${gName}`, (uName && ciDate) && `unit_${uName}_${ciDate}`].filter(Boolean);
    for (const k of localKeys) {
      if (localStorage.getItem(`guest_reg_${k}`) === 'true') return true;
    }

    // 2. Firestore guest_reg collection
    const inGuestReg = firestoreGuestRegs.some((r: any) => {
      if (!r) return false;
      const rCode = (r.confirmationCode || r.bookingId || r.id || '').trim();
      const rGName = (r.guestName || r.fullName || '').toLowerCase().trim();
      const rUName = (r.unitName || '').toLowerCase().trim();
      const rCiDate = (r.checkInDate || '').trim();

      if (code && rCode && (code === rCode || rCode.includes(code) || code.includes(rCode))) return true;
      if (id && rCode && (id === rCode || rCode.includes(id) || id.includes(rCode))) return true;
      if (r.id && (r.id === code || r.id === id || r.id === `guest_reg_${code}` || r.id === `guest_reg_${id}`)) return true;
      if (gName && rGName && (gName.includes(rGName) || rGName.includes(gName))) return true;
      if (uName && rUName && uName === rUName && ciDate && rCiDate && ciDate === rCiDate) return true;
      return false;
    });
    if (inGuestReg) return true;

    // 3. Firestore guests collection
    return firestoreGuests.some((g: any) => {
      if (!g) return false;
      const gFullName = (g.fullName || g.guestName || '').toLowerCase().trim();
      const gUName = (g.unitName || '').toLowerCase().trim();
      const gCiDate = (g.checkInDate || '').trim();
      const gBId = (g.bookingId || g.confirmationCode || g.id || '').trim();

      if (code && gBId && (code === gBId || gBId.includes(code) || code.includes(gBId))) return true;
      if (id && gBId && (id === gBId || gBId.includes(id) || id.includes(gBId))) return true;
      if (gName && gFullName && (gName.includes(gFullName) || gFullName.includes(gName))) return true;
      if (uName && gUName && uName === gUName && ciDate && gCiDate && ciDate === gCiDate) return true;
      return false;
    });
  };

  const isPostCheckOutComplete = (res: any, idx: number) => {
    const code = (res.confirmationCode || '').trim();
    const id = (res.id || '').trim();
    const depKey = `dep-${idx}`;
    const gName = (res.guestName || res.guest?.name || '').toLowerCase().trim();
    const uName = (res.unitName || '').toLowerCase().trim();
    const cName = (res.villa || res.complexName || '').toLowerCase().trim();
    const coDate = (res.checkOutDate || res.checkOut || '').trim();

    // 1. LocalStorage lookup
    const localKeys = [code, id, depKey, gName && `name_${gName}`, (uName && coDate) && `unit_${uName}_${coDate}`].filter(Boolean);
    for (const k of localKeys) {
      const val = localStorage.getItem(`post_checkout_${k}`);
      if (val === 'true' || (val && val.startsWith('{'))) return true;
    }

    // 2. Real-time Firestore records
    return firestorePostReports.some((r: any) => {
      if (!r) return false;
      const rCode = (r.confirmationCode || r.bookingId || r.id || '').trim();
      const rGName = (r.guestName || r.fullName || '').toLowerCase().trim();
      const rUName = (r.unitName || '').toLowerCase().trim();
      const rCName = (r.complexName || r.villa || '').toLowerCase().trim();
      const rCoDate = (r.checkOutDate || '').trim();

      if (code && rCode && (code === rCode || rCode.includes(code) || code.includes(rCode))) return true;
      if (id && rCode && (id === rCode || rCode.includes(id) || id.includes(rCode))) return true;
      if (r.id && (r.id === code || r.id === id || r.id === `post_checkout_${code}` || r.id === `post_checkout_${id}`)) return true;
      if (gName && rGName && (gName.includes(rGName) || rGName.includes(gName))) {
        if (!uName || !rUName || uName === rUName || !cName || !rCName || cName === rCName) return true;
      }
      if (uName && rUName && uName === rUName && coDate && rCoDate && coDate === rCoDate) return true;
      return false;
    });
  };

  const isSurveySentComplete = (res: any, idx: number) => {
    const code = (res.confirmationCode || '').trim();
    const id = (res.id || '').trim();
    const depKey = `dep-${idx}`;
    const gEmail = (res.guestEmail || res.guest?.email || '').toLowerCase().trim();
    const gName = (res.guestName || res.guest?.name || '').toLowerCase().trim();

    if (sentSurveys[code] || sentSurveys[id] || sentSurveys[depKey] || (gEmail && sentSurveys[gEmail]) || (gName && sentSurveys[gName])) {
      return true;
    }

    return firestoreSurveys.some((s: any) => {
      if (!s) return false;
      const sCode = (s.confirmationCode || s.resId || s.bookingId || s.id || '').trim();
      const sEmail = (s.guestEmail || s.recipient || '').toLowerCase().trim();
      const sName = (s.guestName || '').toLowerCase().trim();

      if (code && sCode && (code === sCode || sCode.includes(code) || code.includes(sCode))) return true;
      if (id && sCode && (id === sCode || sCode.includes(id) || id.includes(sCode))) return true;
      if (s.id && (s.id === code || s.id === id || s.id === `survey_${code}` || s.id === `survey_${id}`)) return true;
      if (gEmail && sEmail && gEmail === sEmail) return true;
      if (gName && sName && (gName.includes(sName) || sName.includes(gName))) return true;
      return false;
    });
  };

  const localDate = new Date();
  const tYear = localDate.getFullYear();
  const tMonth = String(localDate.getMonth() + 1).padStart(2, '0');
  const tDay = String(localDate.getDate()).padStart(2, '0');
  const todayStr = `${tYear}-${tMonth}-${tDay}`;

  const tomorrow = new Date(localDate);
  tomorrow.setDate(localDate.getDate() + 1);
  const tmYear = tomorrow.getFullYear();
  const tmMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tmDay = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${tmYear}-${tmMonth}-${tmDay}`;

  const allDisplayedRes = [...arrivals, ...departures];
  const uniqueVillasSet = new Set<string>();
  allDisplayedRes.forEach((r: any) => {
    if (r.complexName) uniqueVillasSet.add(r.complexName);
    if (r.unitName) uniqueVillasSet.add(r.unitName);
  });
  const uniqueVillas = Array.from(uniqueVillasSet).sort();

  const filterByDateAndVilla = (items: any[], dateField: 'checkIn' | 'checkOut') => {
    return items.filter((r: any) => {
      const matchesVilla = selectedVillaFilter === 'All' || 
        matchesProperty(selectedVillaFilter, r.complexName || '') ||
        matchesProperty(selectedVillaFilter, r.unitName || '') ||
        matchesProperty(selectedVillaFilter, r.villa || '');
      if (!matchesVilla) return false;

      const dateStr = r[dateField === 'checkIn' ? 'checkInDate' : 'checkOutDate'] || r[dateField] || '';
      if (selectedDateFilter === 'today') return dateStr === todayStr;
      if (selectedDateFilter === 'tomorrow') return dateStr === tomorrowStr;
      return dateStr === todayStr || dateStr === tomorrowStr;
    });
  };

  const filteredArrivals = filterByDateAndVilla(arrivals, 'checkIn');
  const filteredDepartures = filterByDateAndVilla(departures, 'checkOut');

  const getStayDuration = (ciStr: string, coStr: string) => {
    if (!ciStr || !coStr) return null;
    const ci = new Date(ciStr);
    const co = new Date(coStr);
    ci.setHours(0,0,0,0);
    co.setHours(0,0,0,0);
    const diffDays = Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  const getStatusDisplay = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === -1) return { text: 'YESTERDAY', color: 'text-rose-600', bg: 'bg-rose-50' };
    if (diffDays === 0) return { text: 'TODAY', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (diffDays === 1) return { text: 'TOMORROW', color: 'text-blue-600', bg: 'bg-blue-50' };
    return { text: `IN ${diffDays} DAYS`, color: 'text-amber-600', bg: 'bg-amber-50' };
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return '?';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const second = parts.length > 1 ? parts[1]?.[0] || '' : '';
    return (first + second).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* Header + quick stats: one continuous white sheet (title/filters on top,
          stats below, separated only by a hairline) instead of stacked boxed cards */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 sm:p-6 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-600" />
              Operations Board
            </h1>
            {lastSyncTime && (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                Last synced: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({allReservations.length} confirmed bookings)
              </p>
            )}
          </div>

          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            
            <select
              value={selectedDateFilter}
              onChange={(e: any) => setSelectedDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-colors cursor-pointer"
            >
              <option value="all">2-Day Window (Today & Tomorrow)</option>
              <option value="today">Today Only ({todayStr})</option>
              <option value="tomorrow">Tomorrow Only ({tomorrowStr})</option>
            </select>

            {uniqueVillas.length > 0 && (
              <select
                value={selectedVillaFilter}
                onChange={(e) => setSelectedVillaFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-colors cursor-pointer"
              >
                <option value="All">All Villas</option>
                {uniqueVillas.map(villa => (
                  <option key={villa} value={villa}>{villa}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-16">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="flex items-center gap-4 p-5 sm:p-6">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Departures in window</p>
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mt-0.5">{filteredDepartures.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 sm:p-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <LogIn className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Arrivals in window</p>
                <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mt-0.5">{filteredArrivals.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isLoading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
          
          {/* Departures (Check-outs) Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Departures</h2>
                <p className="text-xs text-slate-500">Check-outs</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              {filteredDepartures.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-500 shadow-sm">
                  No departures in this window.
                </div>
              ) : (
                [...filteredDepartures]
                .sort((a, b) => new Date(a.checkOutDate || a.checkOut || 0).getTime() - new Date(b.checkOutDate || b.checkOut || 0).getTime())
                .map((res: any, idx) => {
                  const status = getStatusDisplay(res.checkOutDate || res.checkOut);
                  const resId = res.confirmationCode || res.id || `dep-${idx}`;
                  
                  const isPostCheckOutDone = isPostCheckOutComplete(res, idx);
                  const isSurveySent = isSurveySentComplete(res, idx);

                  const bookingData = {
                    id: resId,
                    checkInDate: res.checkInDate || res.checkIn,
                    checkOutDate: res.checkOutDate || res.checkOut,
                    complexName: res.complexName || res.villa,
                    villa: res.villa,
                    unitName: res.unitName,
                    guestName: res.guestName || res.guest?.name,
                    guestEmail: res.guestEmail || res.guest?.email || "",
                    guestsCount: res.guests || res.guestCount || '',
                    nights: getStayDuration(res.checkInDate || res.checkIn, res.checkOutDate || res.checkOut)
                  };

                  return (
                    <div key={resId} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all flex overflow-hidden">
                    <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col gap-3">
                      {/* Row 1: Status & Date */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider leading-tight px-2 py-0.5 rounded-full ${status.color} ${status.bg}`}>
                          {status.text}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-400 font-medium">{res.checkOutDate || res.checkOut}</span>
                      </div>
                      
                      {/* Row 2: Guest Details */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                          {getInitials(bookingData.guestName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm sm:text-base break-words leading-snug">{bookingData.guestName}</p>
                          <p className="text-xs sm:text-sm text-slate-500 truncate">{bookingData.complexName}{bookingData.unitName ? ` - ${bookingData.unitName}` : ''}</p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                        <button
                          onClick={() => {
                            onSelectView('post_checkout', bookingData);
                          }}
                          disabled={!canEdit}
                          title={!canEdit ? 'View-only access: you cannot submit reports.' : undefined}
                          className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl font-semibold text-sm transition-colors sm:whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                            isPostCheckOutDone
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          <ClipboardCheck className="w-4 h-4 shrink-0" /> 
                          <span className="truncate">{isPostCheckOutDone ? 'Checkout Report Done' : 'Post Check-out Report'}</span>
                        </button>
                        
                        {userRole !== 'supervisor' && (
                        <button
                          onClick={() => {
                            const surveyUrl = `https://forms.gle/joBC1gteqn14A1Hs6`;
                            const email = bookingData.guestEmail || '';
                            const guestName = bookingData.guestName || 'Valued Guest';
                            const accommodation = bookingData.complexName ? `${bookingData.complexName}${bookingData.unitName ? ` - ${bookingData.unitName}` : ''}` : '';
                            
                            const defaultSubject = `How was your stay? We'd love your feedback! 🌸 - EVDEkimi Concierge Team`;
                            const defaultMessage = `Dear ${guestName},\n\nWe hope you had a wonderful and memorable stay with us${accommodation ? ` at ${accommodation}` : ''}!\n\nYour comfort and satisfaction mean everything to our team. Could you please take 1 minute to share your feedback with us? Your thoughts help us continuously elevate our hospitality services.\n\n👉 Click here to complete our quick survey:\n${surveyUrl}\n\nThank you once again for choosing EVDEkimi Real Estates. It was a true pleasure hosting you, and we look forward to welcoming you back again soon!\n\nWarmest regards,\nEVDEkimi Concierge Team`;
                            setSurveyModalData({
                              resId,
                              guestName,
                              guestEmail: email,
                              complexName: bookingData.complexName || '',
                              unitName: bookingData.unitName || '',
                              surveyUrl,
                              subject: defaultSubject,
                              message: defaultMessage
                            });
                            setRecipientEmailInput(email);
                            setCopySuccess(false);
                          }}
                          disabled={isSurveySent}
                          className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl font-semibold text-sm transition-colors sm:whitespace-nowrap ${isSurveySent ? 'bg-emerald-50 text-emerald-700 cursor-default' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                        >
                          {isSurveySent ? <CheckCircle className="w-4 h-4 shrink-0" /> : <Mail className="w-4 h-4 shrink-0" />} 
                          <span className="truncate">{isSurveySent ? 'Sent' : 'Send Survey'}</span>
                        </button>
                        )}
                      </div>
                    </div>
                    <div className="w-[30%] shrink-0 bg-amber-50 flex flex-col items-center justify-center gap-1 p-3 text-center">
                      {bookingData.nights && (
                        <>
                          <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 leading-none">{bookingData.nights}</span>
                          <span className="text-[10px] sm:text-xs font-semibold text-amber-600 uppercase tracking-wide mt-0.5">Night{bookingData.nights > 1 ? 's' : ''}</span>
                        </>
                      )}
                      {bookingData.guestsCount && (
                        <span className="text-[11px] font-semibold text-amber-600/80 mt-1">{bookingData.guestsCount} Guest{bookingData.guestsCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Arrivals (Check-ins) Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Arrivals</h2>
                <p className="text-xs text-slate-500">Check-ins</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              {filteredArrivals.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-500 shadow-sm">
                  No arrivals in this window.
                </div>
              ) : (
                [...filteredArrivals]
                .sort((a, b) => new Date(a.checkInDate || a.checkIn || 0).getTime() - new Date(b.checkInDate || b.checkIn || 0).getTime())
                .map((res: any, idx) => {
                  const status = getStatusDisplay(res.checkInDate || res.checkIn);
                  const resId = res.confirmationCode || res.id || `arr-${idx}`;
                  
                  const isPreCheckInDone = isPreCheckInComplete(res, idx);
                  const isGuestRegDone = isGuestRegComplete(res, idx);

                  const bookingData = {
                    id: resId,
                    checkInDate: res.checkInDate || res.checkIn,
                    checkOutDate: res.checkOutDate || res.checkOut,
                    complexName: res.complexName || res.villa,
                    villa: res.villa,
                    unitName: res.unitName,
                    guestName: res.guestName || res.guest?.name,
                    guestEmail: res.guestEmail || res.guest?.email || "",
                    guestsCount: res.guests || res.guestCount || '',
                    nights: getStayDuration(res.checkInDate || res.checkIn, res.checkOutDate || res.checkOut)
                  };

                  return (
                    <div key={resId} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all flex overflow-hidden">
                    <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col gap-3">
                      {/* Row 1: Status & Date */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider leading-tight px-2 py-0.5 rounded-full ${status.color} ${status.bg}`}>
                          {status.text}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-400 font-medium">{res.checkInDate || res.checkIn}</span>
                      </div>
                      
                      {/* Row 2: Guest Details */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs sm:text-sm flex items-center justify-center shrink-0">
                          {getInitials(bookingData.guestName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm sm:text-base break-words leading-snug">{bookingData.guestName}</p>
                          <p className="text-xs sm:text-sm text-slate-500 truncate">{bookingData.complexName}{bookingData.unitName ? ` - ${bookingData.unitName}` : ''}</p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1">
                        <button
                          onClick={() => {
                            onSelectView('pre_checkin', bookingData);
                          }}
                          disabled={!canEdit}
                          title={!canEdit ? 'View-only access: you cannot submit reports.' : undefined}
                          className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl font-semibold text-sm transition-colors sm:whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                            isPreCheckInDone 
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          <CheckSquare className="w-4 h-4 shrink-0" /> 
                          <span className="truncate">{isPreCheckInDone ? 'Edit Pre Check-in' : 'Pre Check-in Report'}</span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectView('checkin', bookingData);
                          }}
                          disabled={!canEdit}
                          title={!canEdit ? 'View-only access: you cannot submit registrations.' : undefined}
                          className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-xl font-semibold text-sm transition-colors sm:whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                            isGuestRegDone
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <UserPlus className="w-4 h-4 shrink-0" /> 
                          <span className="truncate">{isGuestRegDone ? 'Edit Registrations' : 'Guest Registration'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="w-[30%] shrink-0 bg-emerald-50 flex flex-col items-center justify-center gap-1 p-3 text-center">
                      {bookingData.nights && (
                        <>
                          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 leading-none">{bookingData.nights}</span>
                          <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 uppercase tracking-wide mt-0.5">Night{bookingData.nights > 1 ? 's' : ''}</span>
                        </>
                      )}
                      {bookingData.guestsCount && (
                        <span className="text-[11px] font-semibold text-emerald-600/80 mt-1">{bookingData.guestsCount} Guest{bookingData.guestsCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* Survey Reconfirmation Modal */}
      {surveyModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Mail className="w-5 h-5 text-indigo-200" />
                Confirm Survey Dispatch
              </div>
              <button 
                onClick={() => setSurveyModalData(null)}
                className="text-indigo-200 hover:text-white text-base p-1 rounded-md transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Please confirm the recipient email address before dispatching the guest satisfaction survey link.
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                      Guest Name
                    </label>
                    <p className="text-sm font-semibold text-slate-900">{surveyModalData.guestName}</p>
                  </div>

                  {surveyModalData.complexName && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        Accommodation
                      </label>
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {surveyModalData.complexName} {surveyModalData.unitName ? `- ${surveyModalData.unitName}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Recipient Email Address</span>
                    {!recipientEmailInput && <span className="text-red-500 text-[11px]">Email required</span>}
                  </label>
                  <input 
                    type="email"
                    value={recipientEmailInput}
                    onChange={(e) => setRecipientEmailInput(e.target.value)}
                    placeholder="e.g. guest@example.com"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* AI Drafted Warm Email Preview */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI Drafted Email Message
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">Sent by EVDEkimi Concierge Team</span>
                </label>
                
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={surveyModalData.subject || ''}
                    onChange={(e) => setSurveyModalData({ ...surveyModalData, subject: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    placeholder="Email Subject"
                  />
                  <textarea
                    rows={6}
                    value={surveyModalData.message || ''}
                    onChange={(e) => setSurveyModalData({ ...surveyModalData, message: e.target.value })}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed font-sans focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
                <p className="font-semibold text-[11px] uppercase tracking-wider text-indigo-700">Google Forms Survey Link:</p>
                <a 
                  href={surveyModalData.surveyUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="font-mono text-[11px] text-indigo-600 underline block truncate hover:text-indigo-800"
                >
                  {surveyModalData.surveyUrl}
                </a>
              </div>

              {copySuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium text-center">
                  Survey link & draft copied to clipboard!
                </div>
              )}

              {emailSendResult && (
                <div className={`p-3 rounded-lg text-xs font-medium border ${
                  emailSendResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <p className="font-semibold">{emailSendResult.message}</p>
                  {!emailSendResult.success && (
                    <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-amber-800">Use default mail app instead:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!recipientEmailInput) return alert("Please enter a recipient email.");
                          const subject = encodeURIComponent(surveyModalData.subject || 'Guest Satisfaction Survey');
                          const body = encodeURIComponent(surveyModalData.message || '');
                          window.location.href = `mailto:${recipientEmailInput}?subject=${subject}&body=${body}`;
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold transition-colors shrink-0"
                      >
                        Open Mail App ↗
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-slate-100">
                {/* Connected Sender Account status banner */}
                {connectedConciergeEmail ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-900 font-semibold truncate">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">Sender Account: <strong className="font-bold">{connectedConciergeEmail}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await googleSignIn();
                          if (res?.user?.email) {
                            const em = res.user.email;
                            localStorage.setItem("concierge_connected_email", em);
                            setConnectedConciergeEmail(em);
                            setEmailSendResult({
                              success: true,
                              message: `✓ Reconnected ${em} with Gmail send permission!`
                            });
                          }
                        } catch (e: any) {
                          setEmailSendResult({
                            success: false,
                            message: `Google authorization failed: ${e?.message || "Failed to authorize"}`
                          });
                        }
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-semibold shrink-0 cursor-pointer"
                    >
                      Reconnect / Switch
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 text-xs text-amber-900">
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Connect concierge@evdekimi.com Account</p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Please connect concierge@evdekimi.com account to grant Gmail sending permission for automatic surveys.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSendingEmail}
                      onClick={async () => {
                        setIsSendingEmail(true);
                        setEmailSendResult(null);
                        try {
                          const res = await googleSignIn();
                          if (res?.accessToken) {
                            const email = res.user?.email || "concierge@evdekimi.com";
                            localStorage.setItem("concierge_connected_email", email);
                            localStorage.setItem("googleOAuthToken", res.accessToken);
                            setConnectedConciergeEmail(email);
                            setEmailSendResult({
                              success: true,
                              message: `✓ Connected ${email}! You can now send survey emails.`
                            });
                          }
                        } catch (err: any) {
                          setEmailSendResult({
                            success: false,
                            message: `Google authorization failed: ${err?.message || "Failed to sign in"}`
                          });
                        } finally {
                          setIsSendingEmail(false);
                        }
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs text-xs cursor-pointer"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      Connect concierge@evdekimi.com Account
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSendingEmail || !recipientEmailInput}
                    onClick={async () => {
                      if (!recipientEmailInput) {
                        alert("Please enter a valid guest recipient email address.");
                        return;
                      }
                      setIsSendingEmail(true);
                      setEmailSendResult(null);
                      try {
                        let idToken = await getAccessToken().catch(() => '');
                        let googleToken = getGoogleToken();
                        
                        // If no Google OAuth token or not a valid Google OAuth token, request fresh permission
                        if (!googleToken || !googleToken.startsWith("ya29.")) {
                          const googleRes = await googleSignIn();
                          if (googleRes?.accessToken) {
                            googleToken = googleRes.accessToken;
                            const connectedEm = googleRes.user?.email || "concierge@evdekimi.com";
                            localStorage.setItem("concierge_connected_email", connectedEm);
                            setConnectedConciergeEmail(connectedEm);
                          } else {
                            throw new Error("Google authentication is required to send survey email.");
                          }
                        }

                        const response = await fetch("/api/send-email", {
                          method: "POST",
                          headers: { 
                            "Content-Type": "application/json",
                            ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {}),
                            "x-google-oauth-token": googleToken
                          },
                          body: JSON.stringify({
                            to: recipientEmailInput,
                            subject: surveyModalData.subject || "Guest Satisfaction Survey - EVDEkimi Real Estates",
                            message: surveyModalData.message || "",
                            recipientName: surveyModalData.guestName,
                            googleOAuthToken: googleToken
                          })
                        });

                        const resData = await response.json().catch(() => ({}));
                        if (response.ok && resData.success) {
                          const newSentSurveys = { 
                            ...sentSurveys, 
                            [surveyModalData.resId]: true,
                            ...(recipientEmailInput ? { [recipientEmailInput.toLowerCase().trim()]: true } : {}),
                            ...(surveyModalData.guestName ? { [surveyModalData.guestName.toLowerCase().trim()]: true } : {})
                          };
                          setSentSurveys(newSentSurveys);
                          localStorage.setItem("sent_surveys", JSON.stringify(newSentSurveys));
                          
                          const surveyRecord = { 
                            sent: true, 
                            sentAt: new Date().toISOString(),
                            resId: surveyModalData.resId,
                            confirmationCode: surveyModalData.resId,
                            guestName: surveyModalData.guestName,
                            guestEmail: recipientEmailInput,
                            complexName: surveyModalData.complexName,
                            unitName: surveyModalData.unitName
                          };
                          saveRecord("survey", surveyModalData.resId, surveyRecord);
                          if (recipientEmailInput) {
                            saveRecord("survey", `email_${recipientEmailInput.toLowerCase().trim()}`, surveyRecord);
                          }
                          
                          setEmailSendResult({
                            success: true,
                            message: resData.message || `✓ Email automatically sent to ${recipientEmailInput}!`
                          });
                          setTimeout(() => {
                            setSurveyModalData(null);
                            setEmailSendResult(null);
                          }, 2500);
                        } else {
                          // Check if token expired or lacks scope
                          if (resData.error?.includes("invalid authentication credentials") || resData.error?.includes("authorization error") || resData.error?.includes("Insufficient Permission")) {
                            localStorage.removeItem("googleOAuthToken");
                          }
                          setEmailSendResult({
                            success: false,
                            message: resData.error || "Failed to dispatch email. Please click 'Reconnect / Switch' to authorize concierge@evdekimi.com."
                          });
                        }
                      } catch (error: any) {
                        setEmailSendResult({
                          success: false,
                          message: error.message || "Error sending email. Please connect concierge@evdekimi.com account."
                        });
                      } finally {
                        setIsSendingEmail(false);
                      }
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSendingEmail ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Sending Survey...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        Send Automatic Email
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!recipientEmailInput) {
                        alert("Please enter a valid guest email address.");
                        return;
                      }
                      const subject = encodeURIComponent(surveyModalData.subject || "Guest Satisfaction Survey - EVDEkimi Real Estates");
                      const body = encodeURIComponent(surveyModalData.message || "");
                      window.location.href = `mailto:${recipientEmailInput}?subject=${subject}&body=${body}`;
                      setSurveyModalData(null);
                    }}
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    Open Mail App
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const fullCopy = `Subject: ${surveyModalData.subject || ""}\n\n${surveyModalData.message || ""}`;
                      navigator.clipboard.writeText(fullCopy);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 3000);
                    }}
                    className="flex-1 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {copySuccess ? "✓ Message Copied!" : "Copy Message"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSurveyModalData(null);
                      setEmailSendResult(null);
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div></div>
          </div>
        </div>
      )}
    </div>
  );
}
