import { deleteRecordWithAliases, deleteRecord } from "../lib/db";
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import React, { useEffect, useState, useMemo } from 'react';
import { getAccessToken, getGoogleToken, db, isSuperUserEmail } from "../lib/auth";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { Guest } from '../types';
import { isReservationAssignedToUser } from '../lib/villaMatcher';
import Toast from './Toast';
import GuestInsights from './GuestInsights';
import { Users, Search, Download, RefreshCcw, Sparkles, TrendingUp, Calendar, MapPin, CheckCircle, Clock, AlertTriangle, Coffee, Camera, Eye, FileText, X, Printer, CheckCircle2, User, Building, CornerDownRight, ChevronLeft , Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { normalizeCountryName } from '../lib/utils';
import * as XLSX from 'xlsx';

interface DashboardProps {
  spreadsheetId: string;
  initialSearchTerm?: string;
  initialTab?: 'overview' | 'list' | 'pre-checkin' | 'post-checkout';
  onComplete?: () => void;
  currentUser?: any;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard({ spreadsheetId, initialSearchTerm, initialTab, onComplete, currentUser }: DashboardProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const canDelete = currentUser?.role === 'admin' || isSuperUserEmail(currentUser?.email);

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'list' | 'pre-checkin' | 'post-checkout'>(
    initialTab || (initialSearchTerm ? 'list' : 'overview')
  );
  
  const [preCheckInReports, setPreCheckInReports] = useState<any[]>([]);
  const [postCheckOutReports, setPostCheckOutReports] = useState<any[]>([]);
  const [selectedReportModal, setSelectedReportModal] = useState<any | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedGuestModal, setSelectedGuestModal] = useState<any | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const renderSubmitter = (val: any): string => {
    if (!val) return 'Concierge Staff';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return val.username || (val.firstName && val.lastName ? `${val.firstName} ${val.lastName}` : '') || val.firstName || val.email || 'Concierge Staff';
    }
    return String(val);
  };

  const extractAllPhotosFromReport = (report: any): string[] => {
    if (!report) return [];
    const photos: string[] = [];

    if (report.photo && typeof report.photo === 'string') photos.push(report.photo);
    if (report.minibarPhoto && typeof report.minibarPhoto === 'string') photos.push(report.minibarPhoto);
    if (Array.isArray(report.photos)) {
      report.photos.forEach((p: any) => typeof p === 'string' && photos.push(p));
    }

    if (report.data && typeof report.data === 'object') {
      Object.values(report.data).forEach((sec: any) => {
        if (!sec) return;
        if (typeof sec === 'string' && (sec.startsWith('data:') || sec.startsWith('http'))) {
          photos.push(sec);
        } else if (Array.isArray(sec)) {
          sec.forEach((p: any) => typeof p === 'string' && photos.push(p));
        } else if (typeof sec === 'object') {
          Object.values(sec).forEach((item: any) => {
            if (!item) return;
            if (typeof item === 'string' && (item.startsWith('data:') || item.startsWith('http'))) {
              photos.push(item);
            } else if (Array.isArray(item)) {
              item.forEach((p: any) => typeof p === 'string' && photos.push(p));
            } else if (typeof item === 'object') {
              if (Array.isArray(item.photos)) {
                item.photos.forEach((p: any) => typeof p === 'string' && photos.push(p));
              } else if (typeof item.photo === 'string') {
                photos.push(item.photo);
              } else if (typeof item.url === 'string') {
                photos.push(item.url);
              }
            }
          });
        }
      });
    }

    return photos;
  };

  const loadReports = async (currentGuests: Guest[], reservations: any[] = []) => {
    const preReportsMap = new Map<string, any>();
    const postReportsMap = new Map<string, any>();
    
    // 1. Process local storage sequentially and safely for instant availability
    const len = localStorage.length;
    for (let i = 0; i < len; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (key.startsWith('pre_checkin_') && !key.startsWith('pre_checkin_draft')) {
        try {
          const val = localStorage.getItem(key);
          if (val && val.startsWith('{')) {
            const report = JSON.parse(val);
            if (!report.timestamp) report.timestamp = new Date(0).toISOString();
            const bId = report.bookingId || key.replace('pre_checkin_', '');
            preReportsMap.set(bId, report);
          } else if (val === 'true') {
            const bookingId = key.replace('pre_checkin_', '');
            const guest = currentGuests.find(g => g.id === bookingId);
            const res = reservations.find(r => (r.confirmationCode || r.id) === bookingId) || reservations.find(r => `arr-${reservations.indexOf(r)}` === bookingId);
            preReportsMap.set(bookingId, {
              type: 'pre_checkin',
              timestamp: new Date(0).toISOString(),
              bookingId,
              guestName: guest?.fullName || res?.guestName || res?.guest?.name || 'Unknown',
              unitName: guest?.unitName || res?.unitName || 'Unknown',
              complexName: guest?.complexName || res?.villa || 'Unknown',
              isLegacy: true
            });
          }
        } catch (e) {
          console.warn("Failed parsing pre_checkin report from local storage", e);
        }
      } else if (key.startsWith('post_checkout_') && !key.startsWith('post_checkout_draft')) {
        try {
          const val = localStorage.getItem(key);
          if (val && val.startsWith('{')) {
            const report = JSON.parse(val);
            if (!report.timestamp) report.timestamp = new Date(0).toISOString();
            const bId = report.bookingId || key.replace('post_checkout_', '');
            postReportsMap.set(bId, report);
          } else if (val === 'true') {
            const bookingId = key.replace('post_checkout_', '');
            const guest = currentGuests.find(g => g.id === bookingId);
            const res = reservations.find(r => (r.confirmationCode || r.id) === bookingId) || reservations.find(r => `dep-${reservations.indexOf(r)}` === bookingId);
            postReportsMap.set(bookingId, {
              type: 'post_checkout',
              timestamp: new Date(0).toISOString(),
              bookingId,
              guestName: guest?.fullName || res?.guestName || res?.guest?.name || 'Unknown',
              unitName: guest?.unitName || res?.unitName || 'Unknown',
              complexName: guest?.complexName || res?.villa || 'Unknown',
              isLegacy: true
            });
          }
        } catch (e) {
          console.warn("Failed parsing post_checkout report from local storage", e);
        }
      }
    }
    
    // Sort descending by timestamp for immediate initial display
    setPreCheckInReports(Array.from(preReportsMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setPostCheckOutReports(Array.from(postReportsMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

    // 2. Fetch direct from Firestore to ensure cross-user & cross-device reports appear
    try {
      const [preSnap, postSnap] = await Promise.all([
        getDocs(collection(db, 'pre_checkin')).catch(() => null),
        getDocs(collection(db, 'post_checkout')).catch(() => null)
      ]);

      if (preSnap && !preSnap.empty) {
        preSnap.forEach(docSnap => {
          const d = docSnap.data();
          const docId = docSnap.id;
          const bId = d.bookingId || docId;
          const existing = preReportsMap.get(bId) || preReportsMap.get(docId);
          const merged = existing ? { ...existing, ...d } : d;
          if (!merged.timestamp) merged.timestamp = d.createdAt || d.updatedAt || new Date(0).toISOString();
          if (!merged.bookingId) merged.bookingId = bId;
          preReportsMap.set(bId, merged);
          try {
            localStorage.setItem(`pre_checkin_${bId}`, JSON.stringify(merged));
          } catch(e) {}
        });
      }

      if (postSnap && !postSnap.empty) {
        postSnap.forEach(docSnap => {
          const d = docSnap.data();
          const docId = docSnap.id;
          const bId = d.bookingId || docId;
          const existing = postReportsMap.get(bId) || postReportsMap.get(docId);
          const merged = existing ? { ...existing, ...d } : d;
          if (!merged.timestamp) merged.timestamp = d.createdAt || d.updatedAt || new Date(0).toISOString();
          if (!merged.bookingId) merged.bookingId = bId;
          postReportsMap.set(bId, merged);
          try {
            localStorage.setItem(`post_checkout_${bId}`, JSON.stringify(merged));
          } catch(e) {}
        });
      }

      const sortedPre = Array.from(preReportsMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const sortedPost = Array.from(postReportsMap.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setPreCheckInReports(sortedPre);
      setPostCheckOutReports(sortedPost);
    } catch (err) {
      console.warn("Notice: Firestore remote report fetch in Dashboard:", err);
    }
  };

  const handleExportXLSX = () => {
    let exportData: any[] = [];
    let fileName = 'Export.xlsx';

    const mapGuestForExport = (g: any) => ({
      'Booking ID': g.bookingId || '',
      'Master/Alias': g.aliasRole || 'Master',
      'Guest ID': g.id || '',
      'Full Name': g.fullName || '',
      'Passport Number': g.passportNumber || '',
      'Nationality': g.nationality || '',
      'DOB': g.dob || '',
      'Gender': g.gender || '',
      'Age': g.calculatedAge || '',
      'Complex Name': g.complexName || '',
      'Unit Name': g.unitName || '',
      'Check-In Date': g.checkInDate || '',
      'Check-Out Date': g.checkOutDate || '',
      'Duration of Stay': g.durationOfStay || '',
      'Guests Count': g.guestsCount || '',
      'Contact Number': g.contactNumber || '',
      'Contact Email': g.contactEmail || '',
      'Purpose/Celebration': g.purpose || '',
      'Upsell Opportunities': typeof g.upsell === 'string' ? g.upsell : (g.upsell ? Object.entries(g.upsell).map(([k,v])=>k+': '+v).join(', ') : ''),
      'Status': g.status || 'Checked In',
      'Submitted At': g.timestamp ? new Date(g.timestamp).toLocaleString() : ''
    });

    if (activeTab === 'list' || activeTab === 'overview') {
      fileName = activeTab === 'list' ? `Guest_List_${new Date().toISOString().split('T')[0]}.xlsx` : `Guest_Overview_${new Date().toISOString().split('T')[0]}.xlsx`;
      const dataToExport = activeTab === 'list' ? filteredGuests : groupedGuests;
      
      // We map the array of grouped elements if overview, else the guests directly
      exportData = activeTab === 'list' ? dataToExport.map(mapGuestForExport) : dataToExport.map((group: any) => mapGuestForExport(group.master || group.aliases[0]));
    } else if (activeTab === 'pre-checkin') {
      fileName = `Pre_CheckIn_Reports_${new Date().toISOString().split('T')[0]}.xlsx`;
      exportData = filteredPreReports.map(r => ({
        'Booking ID': r.bookingId || '',
        'Guest Name': r.guestName || '',
        'Complex Name': r.complexName || '',
        'Unit Name': r.unitName || '',
        'Submitted At': r.timestamp ? new Date(r.timestamp).toLocaleString() : '',
        'Submitted By': r.submittedBy || 'Concierge',
        'Minibar Missing Value (IDR)': r.minibarConsumed ? r.minibarConsumed.reduce((acc, curr) => acc + (curr.qtyConsumed * curr.price), 0) : 0,
        'Maintenance Defect': r.maintenanceNeeded ? 'YES' : 'NO',
        'Maintenance Notes': r.maintenanceNotes || '',
        'Inspector Signature': r.signature || ''
      }));
    } else if (activeTab === 'post-checkout') {
      fileName = `Post_CheckOut_Reports_${new Date().toISOString().split('T')[0]}.xlsx`;
      exportData = filteredPostReports.map(r => ({
        'Booking ID': r.bookingId || '',
        'Guest Name': r.guestName || '',
        'Complex Name': r.complexName || '',
        'Unit Name': r.unitName || '',
        'Submitted At': r.timestamp ? new Date(r.timestamp).toLocaleString() : '',
        'Submitted By': r.submittedBy || 'Concierge',
        'Minibar Total (IDR)': r.totalMinibar || 0,
        'Maintenance Defect': r.maintenanceNeeded ? 'YES' : 'NO',
        'Maintenance Notes': r.maintenanceNotes || '',
        'Inspector Signature': r.signature || ''
      }));
    }

    if (exportData.length === 0) {
      alert("No data available to export.");
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, fileName);
      console.log("XLSX.writeFile called with fileName:", fileName);
      alert("Export triggered! If the download did not start, please click the 'Open in New Tab' icon in the top right of the preview window and try again, as iframe previews sometimes block downloads.");
    } catch (e) {
      console.error("Export XLSX error:", e);
      alert("Failed to export. Check console.");
    }
  };

  const fetchGuests = async () => {
    setIsLoading(true);
    let guestsList: Guest[] = [];
    let resList: any[] = [];

    // 1. First read locally registered guests from localStorage cache
    try {
      const localSaved = (await idbGet("concierge_registered_guests"));
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          guestsList = parsed;
        }
      }
    } catch (e) {}

    // 2. Fetch reservations, remote guests, and Firestore guests in parallel
    try {
      const token = await getAccessToken().catch(() => 'dummy-token');
      const [resData, guestsRes, firestoreGuestsSnap] = await Promise.all([
        fetch('/api/reservations', {
          headers: { Authorization: `Bearer ${token}`, "x-google-oauth-token": getGoogleToken() }
        }).then(async r => {
          if (r.ok && r.headers.get("content-type")?.includes("application/json")) {
            return await r.json();
          }
          return { reservations: [] };
        }).catch(() => ({ reservations: [] })),
        fetch(`/api/guests?spreadsheetId=${spreadsheetId}`, {
          headers: { Authorization: `Bearer ${token}`, "x-google-oauth-token": getGoogleToken() }
        }).then(async r => {
          if (r.ok && r.headers.get("content-type")?.includes("application/json")) {
            return await r.json();
          }
          return null;
        }).catch(() => null),
        getDocs(collection(db, 'guests')).catch(() => null)
      ]);

      resList = resData.reservations || resData.data || [];

      const combinedMap = new Map<string, Guest>();

      // Add local guests
      guestsList.forEach(g => {
        const idKey = g.id || g.passportNumber || `${g.fullName}_${g.unitName}_${g.checkInDate}`;
        if (idKey) combinedMap.set(idKey, g);
      });

      // Add remote guests from Google Sheets
      if (guestsRes && Array.isArray(guestsRes.guests) && guestsRes.guests.length > 0) {
        guestsRes.guests.forEach((g: any) => {
          const idKey = g.id || g.passportNumber || `${g.fullName}_${g.unitName}_${g.checkInDate}`;
          if (idKey) {
            const existing = combinedMap.get(idKey);
            combinedMap.set(idKey, existing ? { ...existing, ...g, id: idKey } : { ...g, id: idKey });
          }
        });
      }

      // Add remote guests from Firestore common database
      if (firestoreGuestsSnap && !firestoreGuestsSnap.empty) {
        firestoreGuestsSnap.forEach(docSnap => {
          const g = docSnap.data() as Guest;
          const idKey = docSnap.id || g.id || g.passportNumber || `${g.fullName}_${g.unitName}_${g.checkInDate}`;
          if (idKey) {
            const existing = combinedMap.get(idKey);
            combinedMap.set(idKey, existing ? { ...existing, ...g, id: docSnap.id || idKey } : { ...g, id: docSnap.id || idKey });
          }
        });
      }

      guestsList = Array.from(combinedMap.values());
      setFetchError(null);
    } catch (err) {
      console.warn("API fetch failed, utilizing cached guest records:", err);
      setFetchError("Unable to connect to the server. Displaying offline data.");
    }

    const filteredGuestsList = guestsList.filter(g => isReservationAssignedToUser(g, currentUser));
    
    // Save consolidated guest list in IndexedDB
    try {
      await idbSet("concierge_registered_guests", JSON.stringify(filteredGuestsList));
    } catch(e) {}

    setGuests(filteredGuestsList);
    setIsLoading(false);
    loadReports(filteredGuestsList, resList);
  };


  useEffect(() => {
    fetchGuests();
    const handleSync = () => fetchGuests();
    window.addEventListener('local-storage-synced', handleSync);

    // Real-time Firestore synchronization listeners
    let unsubGuests: any;
    let unsubPre: any;
    let unsubPost: any;
    try {
      unsubGuests = onSnapshot(collection(db, 'guests'), (snap) => {
        if (!snap.metadata.hasPendingWrites) {
          fetchGuests();
        }
      }, (e) => console.warn("Firestore guests snapshot notice:", e));

      unsubPre = onSnapshot(collection(db, 'pre_checkin'), (snap) => {
        if (!snap.metadata.hasPendingWrites) {
          fetchGuests();
        }
      }, (e) => console.warn("Firestore pre_checkin snapshot notice:", e));

      unsubPost = onSnapshot(collection(db, 'post_checkout'), (snap) => {
        if (!snap.metadata.hasPendingWrites) {
          fetchGuests();
        }
      }, (e) => console.warn("Firestore post_checkout snapshot notice:", e));
    } catch (e) {}
    
    // Background queue processor
    let isProcessorRunning = true;
    const processQueue = async () => {
      if (!isProcessorRunning) return;
      try {
        const localSaved = (await idbGet("concierge_registered_guests"));
        if (!localSaved) return;
        let guests = JSON.parse(localSaved);
        let hasChanges = false;
        
        for (let i = 0; i < guests.length; i++) {
          if (guests[i].status === 'In Queue') {
            try {
              const token = await getAccessToken();
              const res = await fetch('/api/guests', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'x-google-oauth-token': getGoogleToken()
                },
                body: JSON.stringify({ guest: guests[i], spreadsheetId })
              });
              if (res.ok) {
                guests[i].status = 'Checked In';
                hasChanges = true;
              }
            } catch (e) {
              console.warn("Background queue item failed to sync:", e);
            }
          }
        }
        
        if (hasChanges) {
          await idbSet("concierge_registered_guests", JSON.stringify(guests));
          fetchGuests(); // Refresh UI
        }
      } catch (e) {
        console.warn("Queue processor error:", e);
      }
      if (isProcessorRunning) setTimeout(processQueue, 120000);
    };
    const queueTimeout = setTimeout(processQueue, 120000);
    
    return () => {
      window.removeEventListener('local-storage-synced', handleSync);
      if (unsubGuests) unsubGuests();
      if (unsubPre) unsubPre();
      if (unsubPost) unsubPost();
      isProcessorRunning = false;
      clearTimeout(queueTimeout);
    };
  }, [spreadsheetId]);



  
  const handleDeleteGuest = async (guest: Guest) => {
    try {
      const id = guest.id || guest.passportNumber || `${guest.fullName}_${guest.unitName}_${guest.checkInDate}`;
      await deleteRecord('guests', id);

      // Also purge the legacy Google Sheets/mock guest ledger — without this,
      // the guest has no delete path there and would resurface on refresh.
      try {
        const authToken = await getAccessToken().catch(() => 'dummy-token');
        await fetch(`/api/guests/${encodeURIComponent(id)}?spreadsheetId=${spreadsheetId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}`, "x-google-oauth-token": getGoogleToken() }
        });
      } catch (e) {
        console.warn('Failed to purge guest from legacy ledger:', e);
      }

      try {
        const localSaved = await idbGet("concierge_registered_guests");
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed)) {
            const newGuests = parsed.filter(g => {
              const gid = g.id || g.passportNumber || `${g.fullName}_${g.unitName}_${g.checkInDate}`;
              return gid !== id;
            });
            await idbSet("concierge_registered_guests", JSON.stringify(newGuests));
          }
        }
      } catch (e) {}
      
      // Attempt to also clean up possible alias records in guest_reg if this was generated by QA
      if (id.startsWith('QA_TEST')) {
        await deleteRecord('guest_reg', id).catch(()=>null);
      }

      setSelectedGuestModal(null); setIsConfirmingDelete(false);
      setGuests(prev => prev.filter(g => {
        const gid = g.id || g.passportNumber || `${g.fullName}_${g.unitName}_${g.checkInDate}`;
        return gid !== id;
      }));
      setToast({ message: 'Guest deleted successfully.', type: 'success' });
    } catch (e) {
      alert("Failed to delete guest.");
    }
  };

  const handleDeleteReport = async (report: any) => {
    
    try {
      const id = report.bookingId || report.id;
      await deleteRecordWithAliases(report.type, id, report.bookingId);
      setSelectedReportModal(null); setIsConfirmingDelete(false);;
      if (report.type === 'pre_checkin') {
        setPreCheckInReports(prev => prev.filter(r => r.bookingId !== report.bookingId && r.id !== id));
      } else {
        setPostCheckOutReports(prev => prev.filter(r => r.bookingId !== report.bookingId && r.id !== id));
      }
      setToast({ message: 'Report deleted successfully.', type: 'success' });
    } catch (e) {
      alert("Failed to delete report.");
    }
  };

  const enrichedGuests = useMemo(() => {
    const groups: Record<string, any[]> = {};
    guests.forEach(g => {
      const key = (g as any).bookingId || `${g.unitName}_${g.checkInDate}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });

    Object.values(groups).forEach(group => {
      group.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      group.forEach((g, idx) => {
        g.isMaster = idx === 0;
        g.aliasRole = idx === 0 ? 'Master' : 'Alias';
      });
    });

    return guests.map(g => {
      let age = '—';
      if (g.dob) {
        let birthDate;
        if (g.dob.includes('.')) {
          const parts = g.dob.split('.');
          if (parts.length === 3) birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else if (g.dob.includes('/')) {
          const parts = g.dob.split('/');
          if (parts.length === 3) birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          birthDate = new Date(g.dob);
        }
        if (birthDate && !isNaN(birthDate.getTime())) {
          const ageDifMs = Date.now() - birthDate.getTime();
          const ageDate = new Date(ageDifMs);
          age = String(Math.abs(ageDate.getUTCFullYear() - 1970));
        }
      }

      let duration = '—';
      if (g.checkInDate && g.checkOutDate) {
        const inD = new Date(g.checkInDate);
        const outD = new Date(g.checkOutDate);
        if (!isNaN(inD.getTime()) && !isNaN(outD.getTime())) {
          const diffTime = Math.abs(outD.getTime() - inD.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          duration = `${diffDays} night${diffDays !== 1 ? 's' : ''}`;
        }
      }

      return {
        ...g,
        nationality: normalizeCountryName(g.nationality),
        calculatedAge: age,
        durationOfStay: duration,
        aliasRole: (g as any).aliasRole || 'Master'
      };
    });
  }, [guests]);

  const filteredGuests = enrichedGuests.filter(g => {
    if (!isReservationAssignedToUser(g, currentUser)) return false;
    return (
      g.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      g.passportNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.complexName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.unitName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  const groupedGuests = useMemo(() => {
    const groups = new Map();
    
    enrichedGuests.forEach(g => {
      const key = g.bookingId || `${g.unitName}_${g.checkInDate}`;
      if (!groups.has(key)) groups.set(key, { master: null, aliases: [] });
      
      const group = groups.get(key);
      if (g.isMaster) {
        group.master = g;
      } else {
        group.aliases.push(g);
      }
    });

    // Ensure every group has a master
    groups.forEach(group => {
      if (!group.master && group.aliases.length > 0) {
         group.master = group.aliases.shift();
      }
    });

    return Array.from(groups.values()).filter(group => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      
      const masterMatches = group.master && (
        group.master.fullName?.toLowerCase().includes(term) ||
        group.master.passportNumber?.toLowerCase().includes(term) ||
        group.master.complexName?.toLowerCase().includes(term) ||
        group.master.unitName?.toLowerCase().includes(term)
      );
      
      const aliasMatches = group.aliases.some((a) => (
        a.fullName?.toLowerCase().includes(term) ||
        a.passportNumber?.toLowerCase().includes(term) ||
        a.complexName?.toLowerCase().includes(term) ||
        a.unitName?.toLowerCase().includes(term)
      ));
      
      return masterMatches || aliasMatches;
    });
  }, [enrichedGuests, searchTerm]);


  const filteredPreReports = preCheckInReports.filter(r => {
    if (!isReservationAssignedToUser(r, currentUser)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.guestName?.toLowerCase().includes(term) || 
      r.bookingId?.toLowerCase().includes(term) ||
      r.complexName?.toLowerCase().includes(term) ||
      r.unitName?.toLowerCase().includes(term) ||
      r.submittedBy?.toLowerCase().includes(term) ||
      r.maintenanceNotes?.toLowerCase().includes(term) ||
      r.signature?.toLowerCase().includes(term)
    );
  });

  const filteredPostReports = postCheckOutReports.filter(r => {
    if (!isReservationAssignedToUser(r, currentUser)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.guestName?.toLowerCase().includes(term) || 
      r.bookingId?.toLowerCase().includes(term) ||
      r.complexName?.toLowerCase().includes(term) ||
      r.unitName?.toLowerCase().includes(term) ||
      r.submittedBy?.toLowerCase().includes(term) ||
      r.maintenanceNotes?.toLowerCase().includes(term) ||
      r.notes?.toLowerCase().includes(term) ||
      r.signature?.toLowerCase().includes(term)
    );
  });

  // Derived Metrics
  const { totalGuests, checkoutsToday, upsellsCount, topNationality, lastMinuteBookingsPct } = useMemo(() => {
    let checkouts = 0;
    let upsells = 0;
    let lastMinuteCount = 0;
    const nats: Record<string, number> = {};
    const todayStr = new Date().toISOString().split('T')[0];

    guests.forEach(g => {
      if (g.checkOutDate === todayStr) checkouts++;
      if (g.upsell && g.upsell !== '') upsells++;
      
      // Calculate last-minute booking % (< 48 hours)
      // We will compare g.timestamp (registration time) to g.checkInDate
      if (g.timestamp && g.checkInDate) {
        const regTime = new Date(g.timestamp).getTime();
        // checkInDate is usually YYYY-MM-DD. We assume it starts at 14:00 (2PM) local time.
        const checkInTime = new Date(g.checkInDate + 'T14:00:00Z').getTime();
        
        if (!isNaN(regTime) && !isNaN(checkInTime)) {
          const hoursDiff = (checkInTime - regTime) / (1000 * 60 * 60);
          if (hoursDiff > 0 && hoursDiff < 48) {
            lastMinuteCount++;
          } else if (hoursDiff <= 0) {
            // If they registered *after* check-in date or exactly on it, it's definitely < 48 hours
            lastMinuteCount++;
          }
        }
      }
      
      const nat = normalizeCountryName(g.nationality);
      nats[nat] = (nats[nat] || 0) + 1;
    });

    let topNat = 'N/A';
    let max = 0;
    for (const [nat, count] of Object.entries(nats)) {
      if (count > max && nat !== 'Unknown') {
        max = count;
        topNat = nat;
      }
    }

    return {
      totalGuests: guests.length,
      checkoutsToday: checkouts,
      lastMinuteBookingsPct: guests.length > 0 ? Math.round((lastMinuteCount / guests.length) * 100) : 0,
      upsellsCount: upsells,
      topNationality: topNat
    };
  }, [guests]);

  // Chart Data: Check-ins by Date
  const checkInChartData = useMemo(() => {
    const dates: Record<string, number> = {};
    guests.forEach(g => {
      const d = g.checkInDate || 'Unknown';
      if (d !== 'Unknown') {
        dates[d] = (dates[d] || 0) + 1;
      }
    });
    // Sort by date and take last 7 days
    const sorted = Object.keys(dates).sort().slice(-7);
    return sorted.map(d => ({
      date: d.substring(5), // MM-DD
      checkins: dates[d]
    }));
  }, [guests]);

  // Chart Data: Purpose
  const purposeChartData = useMemo(() => {
    const purposes: Record<string, number> = {};
    guests.forEach(g => {
      let p = g.purpose?.trim() || 'Other';
      if (p.toLowerCase().includes('leisure') || p.toLowerCase().includes('holiday')) p = 'Leisure';
      else if (p.toLowerCase().includes('business') || p.toLowerCase().includes('work')) p = 'Business';
      else if (p.toLowerCase().includes('transit')) p = 'Transit';
      purposes[p] = (purposes[p] || 0) + 1;
    });
    return Object.keys(purposes).map(k => ({
      name: k,
      value: purposes[k]
    }));
  }, [guests]);


  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full">
      {onComplete && (
        <button 
          onClick={onComplete}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Return to Home Menu
        </button>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time overview of guest check-ins and insights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportXLSX}
            className="text-xs sm:text-sm px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-sm shrink-0"
            title="Export data to XLSX file format"
          >
            <Download className="w-4 h-4" />
            Export to XLSX
          </button>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg overflow-x-auto">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Guest List
            </button>
            <button 
              onClick={() => setActiveTab('pre-checkin')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'pre-checkin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Pre-Check-In Reports
            </button>
            <button 
              onClick={() => setActiveTab('post-checkout')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'post-checkout' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Post-Check-Out Reports
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <GuestInsights guests={guests} />
      )}

      {activeTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search guests by name or passport..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button 
                onClick={fetchGuests}
                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
                title="Refresh"
              >
                <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={handleExportXLSX}
                className="text-sm px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold transition-colors flex items-center gap-2 shadow-sm"
                title="Export list to XLSX format"
              >
                <Download className="w-4 h-4" />
                Export to XLSX
              </button>
            </div>
          </div>

          {isLoading && guests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
              <RefreshCcw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="font-medium">Loading guest database...</p>
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
              <Users className={`w-12 h-12 ${fetchError ? 'text-rose-300' : 'text-slate-300'}`} />
              <p className="font-medium text-lg">{fetchError ? 'Data unavailable' : 'No guests found'}</p>
              <p className="text-sm">{fetchError ? fetchError : 'Try adjusting your search terms.'}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white border-b border-slate-200">
                    <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="px-6 py-4 font-semibold w-16">Profile</th>
                      <th className="px-6 py-4 font-semibold">Guest Information</th>
                      <th className="px-6 py-4 font-semibold">Accommodation</th>
                      <th className="px-6 py-4 font-semibold">Stay Dates</th>
                      <th className="px-6 py-4 font-semibold">Contact Info</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {groupedGuests.map((group, idx) => {
                      const master = group.master;
                      if (!master) return null;
                      return (
                        <React.Fragment key={master.id || idx}>
                          <tr onClick={() => setSelectedGuestModal(master)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                            <td className="px-6 py-4">
                              {master.photo ? (
                                <img src={master.photo.startsWith('http') || master.photo.startsWith('data:') ? master.photo : `data:image/jpeg;base64,${master.photo}`} alt="Guest" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-sm font-bold">
                                  {master.fullName?.charAt(0) || '?'}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900 text-base mb-0.5">{master.fullName || 'Unknown Guest'}</div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                                <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 font-bold">
                                  Master
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {master.nationality || 'N/A'}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono">{master.passportNumber}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1">DOB: {master.dob} (Age: {master.calculatedAge}) | {master.gender}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-800 mb-0.5">{master.unitName || '—'}</div>
                              <div className="text-xs text-slate-500">{master.complexName}</div>
                              {master.guestsCount && <div className="text-xs text-slate-400 mt-1">{master.guestsCount} guest(s) total</div>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 mb-1 text-slate-700">
                                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="font-medium text-xs">{master.checkInDate || '—'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <Clock className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-xs">{master.checkOutDate || '—'}</span>
                              </div>
                              <div className="text-xs text-slate-400">{master.durationOfStay}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-slate-800 mb-1">{master.contactNumber || '—'}</div>
                              <div className="text-xs text-slate-500">{master.contactEmail || '—'}</div>
                            </td>
                          </tr>
                          {group.aliases.map((alias: any) => (
                            <tr key={alias.id} onClick={() => setSelectedGuestModal(alias)} className="hover:bg-slate-100 transition-colors cursor-pointer bg-slate-50/50 group">
                              <td className="px-6 py-3 pl-10 flex items-center gap-3">
                                <CornerDownRight className="w-4 h-4 text-slate-300 shrink-0" />
                                {alias.photo ? (
                                  <img src={alias.photo.startsWith('http') || alias.photo.startsWith('data:') ? alias.photo : `data:image/jpeg;base64,${alias.photo}`} alt="Alias" className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 shadow-sm flex items-center justify-center text-slate-500 text-sm font-bold">
                                    {alias.fullName?.charAt(0) || '?'}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                <div className="font-bold text-slate-700 text-sm mb-0.5">{alias.fullName || 'Unknown Guest'}</div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                                  <span className="flex items-center gap-1 text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300">
                                    Alias
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {alias.nationality || 'N/A'}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono">{alias.passportNumber}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-slate-500 text-sm">
                                <span className="italic text-xs text-slate-400">Accompanied</span>
                              </td>
                              <td className="px-6 py-3">
                                 <div className="text-xs text-slate-400 mt-1">DOB: {alias.dob} (Age: {alias.calculatedAge}) | {alias.gender}</div>
                              </td>
                              <td className="px-6 py-3 text-slate-500 text-sm">
                                <div className="text-sm font-medium text-slate-700 mb-1">{alias.contactNumber || '—'}</div>
                                <div className="text-xs text-slate-500">{alias.contactEmail || '—'}</div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block lg:hidden flex-col divide-y divide-slate-100">
                {groupedGuests.map((group, idx) => {
                  const master = group.master;
                  if (!master) return null;
                  return (
                    <div key={master.id || idx} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex gap-4 cursor-pointer" onClick={() => setSelectedGuestModal(master)}>
                        <div className="shrink-0">
                          {master.photo ? (
                            <img src={master.photo.startsWith('http') || master.photo.startsWith('data:') ? master.photo : `data:image/jpeg;base64,${master.photo}`} alt="Guest" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 text-base font-bold">
                              {master.fullName?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-slate-900 truncate pr-2 text-base">{master.fullName || 'Unknown Guest'}</h3>
                            <span className="shrink-0 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 font-bold text-[10px] uppercase">
                              Master
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium mb-2">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {master.nationality || 'N/A'}</span>
                            <span className="text-slate-300 hidden sm:inline">•</span>
                            <span className="font-mono bg-slate-100 px-1.5 rounded">{master.passportNumber}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-3 bg-white p-2.5 rounded-lg border border-slate-100">
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Accommodation</div>
                              <div className="text-sm font-medium text-slate-800">{master.unitName || '—'}</div>
                              <div className="text-xs text-slate-500 truncate">{master.complexName}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Dates</div>
                              <div className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {master.checkInDate || '—'}
                              </div>
                              <div className="text-xs font-medium text-rose-500 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" /> {master.checkOutDate || '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Aliases for Mobile */}
                      {group.aliases.length > 0 && (
                        <div className="mt-3 pl-8 space-y-2 relative before:absolute before:left-6 before:top-2 before:bottom-4 before:w-px before:bg-slate-200">
                          {group.aliases.map((alias: any) => (
                            <div key={alias.id} className="flex gap-3 relative bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 cursor-pointer" onClick={() => setSelectedGuestModal(alias)}>
                              <div className="absolute -left-[9px] top-4 w-4 h-px bg-slate-200"></div>
                              <div className="shrink-0">
                                {alias.photo ? (
                                  <img src={alias.photo.startsWith('http') || alias.photo.startsWith('data:') ? alias.photo : `data:image/jpeg;base64,${alias.photo}`} alt="Alias" className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 shadow-sm flex items-center justify-center text-slate-500 text-xs font-bold">
                                    {alias.fullName?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                  <h4 className="font-semibold text-slate-700 text-sm truncate pr-2">{alias.fullName || 'Unknown'}</h4>
                                  <span className="shrink-0 text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded font-medium text-[10px]">
                                    Alias
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span>{alias.nationality || 'N/A'}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono">{alias.passportNumber}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'pre-checkin' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Section Header & Search Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Pre-Check-In Reports
                <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {filteredPreReports.length} Reports
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">Room staging checks, amenities verification, and pre-arrival inspections.</p>
            </div>

            {/* Live Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search reports by guest, villa, inspector..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {filteredPreReports.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No Pre-Check-In reports found.</p>
              {searchTerm && <p className="text-xs text-slate-400 mt-1">Try resetting your keyword search: "{searchTerm}"</p>}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPreReports.map((report, idx) => (
                <div 
                  key={idx} 
                  className="p-5 sm:p-6 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => setSelectedReportModal(report)}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                          {report.guestName}
                        </h3>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded">
                          {report.bookingId}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm mt-0.5 font-medium">
                        {report.complexName} {report.unitName ? `- ${report.unitName}` : ''}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        Submitted by: <span className="font-semibold text-slate-700">{renderSubmitter(report.submittedBy)}</span>
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-xs font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Inspected
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReportModal(report);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-md transition-colors shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Open Report
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(report.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(report.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 text-sm mt-3">
                    {report.maintenanceNeeded && (
                      <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-lg text-rose-800 shadow-xs flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-xs uppercase tracking-wider text-rose-900 block">Maintenance Defect Flagged</span>
                          <p className="text-rose-800 text-xs mt-0.5">{report.maintenanceNotes}</p>
                        </div>
                      </div>
                    )}

                    {extractAllPhotosFromReport(report).length > 0 && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="text-slate-500 text-xs font-semibold flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          Inspection Photos ({extractAllPhotosFromReport(report).length})
                        </span>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {extractAllPhotosFromReport(report).slice(0, 5).map((photo: string, pIdx: number) => (
                            <div 
                              key={pIdx} 
                              className="w-9 h-9 rounded border border-slate-200 overflow-hidden shrink-0 bg-white shadow-2xs hover:scale-105 transition-transform"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage(photo);
                              }}
                            >
                              <img src={photo} alt="Photo" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {extractAllPhotosFromReport(report).length > 5 && (
                            <span className="text-xs text-indigo-600 font-bold ml-1">
                              +{extractAllPhotosFromReport(report).length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'post-checkout' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Section Header & Search Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Post-Check-Out Reports
                <span className="bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {filteredPostReports.length} Reports
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">Post-departure clearance, minibar usage, and damage reports.</p>
            </div>

            {/* Live Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search reports by guest, villa, minibar, inspector..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-xs"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {filteredPostReports.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No Post-Check-Out reports found.</p>
              {searchTerm && <p className="text-xs text-slate-400 mt-1">Try resetting your keyword search: "{searchTerm}"</p>}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPostReports.map((report, idx) => (
                <div 
                  key={idx} 
                  className="p-5 sm:p-6 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => setSelectedReportModal(report)}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                          {report.guestName}
                        </h3>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded">
                          {report.bookingId}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm mt-0.5 font-medium">
                        {report.complexName} {report.unitName ? `- ${report.unitName}` : ''}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        Submitted by: <span className="font-semibold text-slate-700">{renderSubmitter(report.submittedBy)}</span>
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2.5 py-1 rounded-md text-xs font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-orange-600" /> Post-Checkout Complete
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReportModal(report);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-md transition-colors shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Open Report
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(report.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(report.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-3">
                    {report.totalMinibar !== undefined && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                          <Coffee className="w-4 h-4 text-orange-600" /> Minibar Consumed
                        </span>
                        <span className="font-bold text-indigo-700">
                          Rp {(report.totalMinibar || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    {report.maintenanceNeeded && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-semibold truncate">Defect: {report.maintenanceNotes}</span>
                      </div>
                    )}

                    {extractAllPhotosFromReport(report).length > 0 && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between sm:col-span-2">
                        <span className="text-slate-500 text-xs font-semibold flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-orange-600" />
                          Clearance Photos ({extractAllPhotosFromReport(report).length})
                        </span>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {extractAllPhotosFromReport(report).slice(0, 5).map((photo: string, pIdx: number) => (
                            <div 
                              key={pIdx} 
                              className="w-9 h-9 rounded border border-slate-200 overflow-hidden shrink-0 bg-white shadow-2xs hover:scale-105 transition-transform"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage(photo);
                              }}
                            >
                              <img src={photo} alt="Photo" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {extractAllPhotosFromReport(report).length > 5 && (
                            <span className="text-xs text-orange-600 font-bold ml-1">
                              +{extractAllPhotosFromReport(report).length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Detail Modal */}
      
      {/* Guest Detail Modal */}
      {selectedGuestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="px-6 py-4 text-white flex items-center justify-between shrink-0 bg-blue-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    {selectedGuestModal.fullName || 'Guest Details'}
                  </h3>
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                    {selectedGuestModal.isMaster ? 'Master Guest' : 'Alias Guest'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedGuestModal(null); setIsConfirmingDelete(false); }} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col sm:flex-row gap-6">
              
              <div className="shrink-0 flex flex-col items-center">
                 {selectedGuestModal.photo ? (
                    <img 
                      src={selectedGuestModal.photo.startsWith('http') || selectedGuestModal.photo.startsWith('data:') ? selectedGuestModal.photo : `data:image/jpeg;base64,${selectedGuestModal.photo}`} 
                      alt="Guest Photo" 
                      onClick={() => setLightboxImage(selectedGuestModal.photo.startsWith('http') || selectedGuestModal.photo.startsWith('data:') ? selectedGuestModal.photo : `data:image/jpeg;base64,${selectedGuestModal.photo}`)}
                      className="w-32 h-32 rounded-xl object-cover border-4 border-slate-100 shadow-sm mb-4 cursor-pointer hover:opacity-90 transition-opacity" 
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-blue-50 border-4 border-white shadow-sm flex items-center justify-center text-blue-300 mb-4">
                       <User className="w-12 h-12" />
                    </div>
                  )}
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${selectedGuestModal.status === 'Checked In' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                     {selectedGuestModal.status || 'Checked In'}
                  </span>
              </div>
              
              <div className="flex-1 space-y-6">
                 <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Identity Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Passport Number</p>
                        <p className="font-mono font-bold text-slate-900">{selectedGuestModal.passportNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Nationality</p>
                        <p className="font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400"/>{selectedGuestModal.nationality || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Date of Birth</p>
                        <p className="font-bold text-slate-900">{selectedGuestModal.dob || 'N/A'} <span className="text-slate-400 font-normal">({selectedGuestModal.calculatedAge || '?'} yrs)</span></p>
                      </div>
                    </div>
                 </div>
                 
                 <div className="h-px bg-slate-100 w-full" />
                 
                 <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Accommodation & Stay</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Villa / Unit</p>
                        <p className="font-bold text-slate-900">{selectedGuestModal.complexName} <span className="text-slate-400 font-normal ml-1">/ {selectedGuestModal.unitName}</span></p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Booking ID</p>
                        <p className="font-mono font-bold text-slate-900 text-xs mt-0.5">{selectedGuestModal.bookingId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Check-in</p>
                        <p className="font-bold text-slate-900">{selectedGuestModal.checkInDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Check-out</p>
                        <p className="font-bold text-slate-900">{selectedGuestModal.checkOutDate || 'N/A'}</p>
                      </div>
                    </div>
                 </div>

                 {(selectedGuestModal.contactNumber || selectedGuestModal.contactEmail) && (
                   <>
                     <div className="h-px bg-slate-100 w-full" />
                     
                     <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Contact Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedGuestModal.contactNumber && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Phone Number</p>
                              <p className="font-bold text-slate-900">{selectedGuestModal.contactNumber}</p>
                            </div>
                          )}
                          {selectedGuestModal.contactEmail && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">Email Address</p>
                              <p className="font-bold text-slate-900">{selectedGuestModal.contactEmail}</p>
                            </div>
                          )}
                        </div>
                     </div>
                   </>
                 )}
                 
                 {(selectedGuestModal.purpose || selectedGuestModal.upsell) && (
                   <>
                     <div className="h-px bg-slate-100 w-full" />
                     <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Additional Details</h4>
                        {selectedGuestModal.purpose && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-slate-500 mb-1">Purpose of Visit / Celebration</p>
                            <p className="text-sm text-slate-900 bg-slate-50 p-2 rounded-md border border-slate-100">{selectedGuestModal.purpose}</p>
                          </div>
                        )}
                        {selectedGuestModal.upsell && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">Upsell Opportunities</p>
                            <p className="text-sm text-slate-900 bg-emerald-50 text-emerald-800 p-2 rounded-md border border-emerald-100">{selectedGuestModal.upsell}</p>
                          </div>
                        )}
                     </div>
                   </>
                 )}
                 
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              {canDelete ? (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-rose-600">Delete this?</span>
                    <button onClick={() => handleDeleteGuest(selectedGuestModal)} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-bold">Yes</button>
                    <button onClick={() => setIsConfirmingDelete(false)} className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-sm font-bold">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )
              ) : <div></div>}
              <button 
                onClick={() => { setSelectedGuestModal(null); setIsConfirmingDelete(false); }} 
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
            
          </div>
        </div>
      )}

      {selectedReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className={`px-6 py-4 text-white flex items-center justify-between shrink-0 ${selectedReportModal.type === 'pre_checkin' ? 'bg-indigo-600' : 'bg-orange-600'}`}>
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-white/80" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/80">
                    {selectedReportModal.type === 'pre_checkin' ? 'Pre-Check-In Inspection Report' : 'Post-Check-Out Clearance Report'}
                  </div>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    {selectedReportModal.guestName}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()} 
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button 
                  onClick={() => { setSelectedReportModal(null); setIsConfirmingDelete(false); }} 
                  className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Summary Metadata Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Accommodation</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedReportModal.complexName || 'Villa'}</p>
                  <p className="text-slate-600 font-medium">{selectedReportModal.unitName || 'Main Unit'}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Booking Ref</span>
                  <p className="font-mono font-bold text-slate-900 text-sm">{selectedReportModal.bookingId}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Inspection Time</span>
                  <p className="font-bold text-slate-900">
                    {new Date(selectedReportModal.timestamp).toLocaleDateString()}
                  </p>
                  <p className="text-slate-500">
                    {new Date(selectedReportModal.timestamp).toLocaleTimeString()}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Inspector</span>
                  <p className="font-bold text-slate-900">{renderSubmitter(selectedReportModal.submittedBy)}</p>
                  <p className="text-slate-500 italic mt-0.5">{selectedReportModal.signature || 'Signed'}</p>
                </div>
              </div>

              {/* Maintenance Alert */}
              {selectedReportModal.maintenanceNeeded && (
                <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-xl text-rose-900 space-y-1">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    Maintenance Defect Flagged
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed font-medium">
                    {selectedReportModal.maintenanceNotes}
                  </p>
                </div>
              )}

              {/* Minibar Section (Pre Check-in) */}
              {selectedReportModal.minibarStock && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-emerald-600" />
                      Minibar Stock Verified
                    </span>
                  </div>

                  <div className="p-4">
                    {selectedReportModal.minibarStock.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No minibar items verified during this stay.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs">
                        <div className="grid grid-cols-12 font-bold text-slate-400 uppercase tracking-wider pb-2">
                          <span className="col-span-8">Item Name</span>
                          <span className="col-span-4 text-right">Available Qty</span>
                        </div>
                        {selectedReportModal.minibarStock.map((item: any, i: number) => (
                          <div key={i} className="grid grid-cols-12 py-2 items-center text-slate-800">
                            <div className="col-span-8 font-medium">
                              {item.name} <span className="text-slate-400 text-[10px]">({item.location})</span>
                            </div>
                            <div className="col-span-4 text-right font-bold text-slate-700">{item.qtyStock}x</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedReportModal.minibarPhoto && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Minibar Verification Photo</span>
                        <img 
                          src={selectedReportModal.minibarPhoto} 
                          alt="Minibar Photo" 
                          className="h-32 rounded-lg border border-slate-200 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setLightboxImage(selectedReportModal.minibarPhoto)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Minibar Section (Post Checkout) */}
              {selectedReportModal.minibarConsumed && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-orange-600" />
                      Minibar Inventory & Consumption
                    </span>
                    <span className="text-indigo-700 font-extrabold text-sm">
                      Total: Rp {(selectedReportModal.totalMinibar || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="p-4">
                    {selectedReportModal.minibarConsumed.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No minibar items consumed during this stay.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs">
                        <div className="grid grid-cols-12 font-bold text-slate-400 uppercase tracking-wider pb-2">
                          <span className="col-span-6">Item Name</span>
                          <span className="col-span-2 text-center">Qty</span>
                          <span className="col-span-2 text-right">Price</span>
                          <span className="col-span-2 text-right">Total</span>
                        </div>
                        {selectedReportModal.minibarConsumed.map((item: any, i: number) => (
                          <div key={i} className="grid grid-cols-12 py-2 items-center text-slate-800">
                            <div className="col-span-6 font-medium">
                              {item.name} <span className="text-slate-400 text-[10px]">({item.location})</span>
                            </div>
                            <div className="col-span-2 text-center font-bold text-slate-700">{item.qtyConsumed}x</div>
                            <div className="col-span-2 text-right text-slate-500">Rp {item.price?.toLocaleString('id-ID')}</div>
                            <div className="col-span-2 text-right font-bold text-slate-900">
                              Rp {(item.qtyConsumed * item.price).toLocaleString('id-ID')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedReportModal.minibarPhoto && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Minibar Verification Photo</span>
                        <img 
                          src={selectedReportModal.minibarPhoto} 
                          alt="Minibar Photo" 
                          className="h-32 rounded-lg border border-slate-200 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setLightboxImage(selectedReportModal.minibarPhoto)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Nested Inspection Data Sections & Photos */}
              {selectedReportModal.data && (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
                    Room & Staging Inspection Breakdown
                  </h3>

                  {Object.entries(selectedReportModal.data).map(([secKey, secObj]: [string, any]) => (
                    <div key={secKey} className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        {secKey.replace(/_/g, ' ')}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(secObj).map(([itemKey, itemVal]: [string, any]) => (
                          <div key={itemKey} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                            <span className="font-semibold text-xs text-slate-800 block capitalize">
                              {itemKey.replace(/_/g, ' ')}
                            </span>

                            {itemVal.photos && itemVal.photos.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {itemVal.photos.map((pUrl: string, pIdx: number) => (
                                  <div 
                                    key={pIdx} 
                                    className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => setLightboxImage(pUrl)}
                                  >
                                    <img src={pUrl} alt="Inspection Photo" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">No photos recorded for this item.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Inspector Signoff */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Inspector Signature: <span className="font-bold text-slate-900 italic ml-1">{selectedReportModal.signature || 'Verified Concierge'}</span>
                </div>
                <div className="text-slate-400">
                  Ref ID: {selectedReportModal.bookingId}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              {canDelete ? (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-rose-600">Delete this?</span>
                    <button onClick={() => handleDeleteReport(selectedReportModal)} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-bold">Yes</button>
                    <button onClick={() => setIsConfirmingDelete(false)} className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-sm font-bold">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )
              ) : <div></div>}
              <button 
                onClick={() => { setSelectedReportModal(null); setIsConfirmingDelete(false); }} 
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Fullscreen Image Preview */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={lightboxImage} alt="Full Size Preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
