import React, { useState, useEffect } from 'react';
import { Coffee, ChevronLeft, Camera, Plus, Save, Trash2, Calendar, FileText, CheckCircle2, TrendingUp, TrendingDown, ArrowRight , Download, Pencil, X} from 'lucide-react';
import { getAccessToken, getGoogleToken, db, isSuperUserEmail } from "../lib/auth";
import { saveRecord, deleteRecord } from '../lib/db';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { MinibarRecord, MinibarItem } from '../types';
import { isReservationAssignedToUser } from '../lib/villaMatcher';
import Toast from './Toast';

const getInitials = (name?: string) => {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[1]?.[0] || '' : '')).toUpperCase();
};

interface MinibarDashboardProps {
  currentUser?: any;
  onBackToHome: () => void;
}

const PREDEFINED_ITEMS = [
  { name: 'Organique Water', defaultPrice: 35000 },
  { name: 'Pocari Sweat', defaultPrice: 25000 },
  { name: 'Soda Water', defaultPrice: 25000 },
  { name: 'Buavita Juice', defaultPrice: 25000 },
  { name: 'Coca-Cola', defaultPrice: 25000 },
  { name: 'Coca-Cola Zero', defaultPrice: 25000 },
  { name: 'UC 1000 Vitamin C', defaultPrice: 30000 },
  { name: 'Redbull', defaultPrice: 50000 },
  { name: 'Snickers', defaultPrice: 30000 },
  { name: 'Oatside Oatmilk', defaultPrice: 20000 },
  { name: 'Bintang', defaultPrice: 50000 },
  { name: 'Bali Hai', defaultPrice: 50000 },
  { name: 'Kura Kura Hazy', defaultPrice: 90000 },
  { name: 'Kura Kura Ale', defaultPrice: 90000 },
  { name: 'Pringless', defaultPrice: 35000 },
  { name: 'Roasted Peanut', defaultPrice: 25000 },
  { name: 'Granobar', defaultPrice: 25000 },
  { name: 'Oatside Cereal Bar', defaultPrice: 25000 },
  { name: 'Roasted Almond', defaultPrice: 30000 },
  { name: 'Salted Pistachio', defaultPrice: 35000 }
];

export default function MinibarDashboard({ currentUser, onBackToHome }: MinibarDashboardProps) {
  const isSupervisor = currentUser?.role === 'supervisor';
  const [activeTab, setActiveTab] = useState<'tracking' | 'log'>(isSupervisor ? 'log' : 'tracking');
  const [complexes, setComplexes] = useState<string[]>([]);
  const [unitsByComplex, setUnitsByComplex] = useState<Record<string, string[]>>({});
  const [recentGuests, setRecentGuests] = useState<any[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState('');

  useEffect(() => {
    if (isSupervisor && activeTab !== 'log') {
      setActiveTab('log');
    }
  }, [isSupervisor, activeTab]);

  
  const [selectedComplex, setSelectedComplex] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<MinibarItem[]>([]);
  
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const canDelete = currentUser?.role === 'admin' || isSuperUserEmail(currentUser?.email);
  const [editFormData, setEditFormData] = useState<Record<string, { initial: number, postOut: number }>>({});

  useEffect(() => {
    const fetchComplexes = async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/complexes', {
          headers: { 'Authorization': `Bearer ${token}`, "x-google-oauth-token": getGoogleToken() }
        });
        if (res.ok) {
          const data = await res.json();
          const allComplexes = data.complexes || [];
          const allUnitsMap = data.unitsByComplex || {};
          
          const allowedComplexes = currentUser?.assignedComplexes || [];
          const allowedUnits = currentUser?.assignedUnits || [];
          
          let filteredComplexes = allComplexes;
          if (currentUser?.role !== 'admin' && allowedComplexes.length > 0) {
            filteredComplexes = allComplexes.filter((cName: string) => {
              const nameLower = (cName || '').toLowerCase().trim();
              return allowedComplexes.some((allowed: string) => {
                const aName = allowed.toLowerCase().trim();
                return nameLower.includes(aName) || aName.includes(nameLower);
              });
            });
          }
          
          setComplexes(filteredComplexes);
          
          const uMap: Record<string, string[]> = {};
          filteredComplexes.forEach((cName: string) => {
            let units = allUnitsMap[cName] || [];
            if (currentUser?.role !== 'admin' && allowedUnits.length > 0) {
              units = units.filter((u: string) => {
                const searchStr = (`${cName} - ${u}`).toLowerCase().trim();
                const justUnitSearchStr = u.toLowerCase().trim();
                return allowedUnits.some((allowed: string) => {
                  const aName = allowed.toLowerCase().trim();
                  return searchStr.includes(aName) || aName.includes(searchStr) || justUnitSearchStr === aName;
                });
              });
            }
            uMap[cName] = units;
          });
          setUnitsByComplex(uMap);
        }
      } catch (e) {
        console.warn("Failed to load complexes", e);
      }
    };
    fetchComplexes();
  }, [currentUser]);

  
  const fetchRecentGuests = async () => {
    try {
      const guestsSnap = await getDocs(collection(db, 'guests'));
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      const recent = guestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .filter(g => {
          const dateStr = g.createdAt || g.checkInDate || g.timestamp;
          if (!dateStr) return false;
          return new Date(dateStr) >= fiveDaysAgo;
        })
        .sort((a, b) => {
          const dateA = a.createdAt || a.checkInDate || a.timestamp || '';
          const dateB = b.createdAt || b.checkInDate || b.timestamp || '';
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        
      setRecentGuests(recent);
    } catch (err) {
      console.warn("Failed to fetch recent guests", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'log') {
      fetchRecentGuests();
    }
  }, [activeTab]);

  
  const handleEditReport = (report: any) => {
    const formData: Record<string, { initial: number, postOut: number, manual: Record<string, number> }> = {};
    PREDEFINED_ITEMS.forEach(item => {
      const preItem = report.preCheckIn?.minibarConsumed?.find((i:any) => i.name === item.name);
      const postItem = report.postCheckOut?.minibarConsumed?.find((i:any) => i.name === item.name);
      
      const manualData: Record<string, number> = {};
      (report.manualLogs || []).forEach((log: any) => {
        const mItem = log.items?.find((i: any) => i.name === item.name);
        manualData[log.id] = mItem ? mItem.quantity : 0;
      });

      formData[item.name] = {
        initial: preItem ? preItem.qtyConsumed : 0,
        postOut: postItem ? postItem.qtyConsumed : 0,
        manual: manualData
      };
    });
    setEditFormData(formData);
    setEditingReport(report);
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;
    setIsSubmitting(true);
    try {
      // 1. Pre Check In
      const hasPre = Object.values(editFormData).some((v: any) => v.initial > 0);
      if (editingReport.preCheckIn || hasPre) {
        const newPreConsumed = PREDEFINED_ITEMS.map(item => ({
          ...item,
          qtyConsumed: editFormData[item.name]?.initial || 0,
          price: item.defaultPrice
        })).filter(i => i.qtyConsumed > 0);
        
        const updatedPre = { 
          ...(editingReport.preCheckIn || { 
            id: `pre_${Date.now()}`, 
            bookingId: editingReport.bookingId,
            complexName: editingReport.complexName,
            unitName: editingReport.unitName,
            createdAt: new Date().toISOString()
          }), 
          minibarConsumed: newPreConsumed 
        };
        updatedPre.totalMinibar = newPreConsumed.reduce((acc, curr) => acc + (curr.qtyConsumed * curr.price), 0);
        await saveRecord('pre_checkin', editingReport.bookingId, updatedPre);
      }

      // 2. Post Check Out
      const hasPost = Object.values(editFormData).some((v: any) => v.postOut > 0);
      if (editingReport.postCheckOut || hasPost) {
        const newPostConsumed = PREDEFINED_ITEMS.map(item => ({
          ...item,
          qtyConsumed: editFormData[item.name]?.postOut || 0,
          price: item.defaultPrice
        })).filter(i => i.qtyConsumed > 0);
        
        const updatedPost = { 
          ...(editingReport.postCheckOut || {
            id: `post_${Date.now()}`, 
            bookingId: editingReport.bookingId,
            complexName: editingReport.complexName,
            unitName: editingReport.unitName,
            createdAt: new Date().toISOString()
          }), 
          minibarConsumed: newPostConsumed 
        };
        updatedPost.totalMinibar = newPostConsumed.reduce((acc, curr) => acc + (curr.qtyConsumed * curr.price), 0);
        await saveRecord('post_checkout', editingReport.bookingId, updatedPost);
      }

      // 3. Manual Logs
      if (editingReport.manualLogs?.length > 0) {
        for (const log of editingReport.manualLogs) {
          const newManualItems = PREDEFINED_ITEMS.map(item => ({
            name: item.name,
            quantity: editFormData[item.name]?.manual?.[log.id] || 0,
            price: item.defaultPrice
          })).filter(i => i.quantity > 0);
          
          const updatedLog = { ...log, items: newManualItems };
          updatedLog.totalRevenue = newManualItems.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
          await saveRecord('minibar', log.id, updatedLog);
        }
      }

      await fetchTrackingReports();
      setEditingReport(null);
    } catch (error) {
      console.error("Failed to update report", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchTrackingReports = async () => {
    setIsLoading(true);
    try {
      const preSnap = await getDocs(collection(db, 'pre_checkin'));
      const postSnap = await getDocs(collection(db, 'post_checkout'));
      const manualSnap = await getDocs(collection(db, 'minibar'));
      const guestsSnap = await getDocs(collection(db, 'guests'));
      
      const bookingsMap: Record<string, any> = {};
      
      guestsSnap.docs.forEach(doc => {
        const d = doc.data();
        if (!d.bookingId) return;
        if (!bookingsMap[d.bookingId]) bookingsMap[d.bookingId] = { bookingId: d.bookingId, unitName: d.unitName, complexName: d.complexName, guestName: d.fullName, checkInDate: d.checkInDate, checkOutDate: d.checkOutDate };
        if (!bookingsMap[d.bookingId].guests) bookingsMap[d.bookingId].guests = [];
        bookingsMap[d.bookingId].guests.push({ id: doc.id, ...d });
      });
      
      preSnap.docs.forEach(doc => {
        const d = doc.data();
        if (!d.bookingId) return;
        if (!bookingsMap[d.bookingId]) bookingsMap[d.bookingId] = { bookingId: d.bookingId, unitName: d.unitName, complexName: d.complexName, guestName: d.guestName, checkInDate: d.checkInDate, checkOutDate: d.checkOutDate };
        // Priority: Use guestName from Pre-Check-In report if available
        if (d.guestName) bookingsMap[d.bookingId].guestName = d.guestName;
        bookingsMap[d.bookingId].preCheckIn = d;
      });
      
      postSnap.docs.forEach(doc => {
        const d = doc.data();
        if (!d.bookingId) return;
        if (!bookingsMap[d.bookingId]) bookingsMap[d.bookingId] = { bookingId: d.bookingId, unitName: d.unitName, complexName: d.complexName, guestName: d.guestName, checkInDate: d.checkInDate, checkOutDate: d.checkOutDate };
        bookingsMap[d.bookingId].postCheckOut = d;
      });

      manualSnap.docs.forEach(doc => {
         const d = doc.data();
         if (!d.bookingId || d.source === 'post_checkout') return;
         if (!bookingsMap[d.bookingId]) bookingsMap[d.bookingId] = { bookingId: d.bookingId, unitName: d.unitName, complexName: d.complexName, guestName: 'Manual Entry' };
         if (!bookingsMap[d.bookingId].manualLogs) bookingsMap[d.bookingId].manualLogs = [];
         bookingsMap[d.bookingId].manualLogs.push(d);
      });

      const sortedReports = Object.values(bookingsMap).sort((a,b) => {
        const dateA = a.postCheckOut?.timestamp || a.preCheckIn?.timestamp || '';
        const dateB = b.postCheckOut?.timestamp || b.preCheckIn?.timestamp || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      // A booking only belongs in this table once it actually has minibar
      // activity to show. This is what makes "delete" stick for real: once
      // handleDeleteReport has cleared out the manual logs and the
      // minibarConsumed/minibarStock fields on the underlying pre_checkin/
      // post_checkout docs, there is genuinely nothing left to display for
      // that booking, so it drops out of the list on its own — no separate
      // hidden/soft-delete bookkeeping required.
      const hasMinibarActivity = (r: any) =>
        (r.manualLogs && r.manualLogs.length > 0) ||
        (r.preCheckIn?.minibarStock && r.preCheckIn.minibarStock.length > 0) ||
        (r.preCheckIn?.minibarConsumed && r.preCheckIn.minibarConsumed.length > 0) ||
        (r.postCheckOut?.minibarConsumed && r.postCheckOut.minibarConsumed.length > 0);
      setReports(sortedReports.filter((r: any) => hasMinibarActivity(r) && isReservationAssignedToUser(r, currentUser)));
    } catch (err) {
      console.warn("Failed to fetch reports", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tracking') {
      fetchTrackingReports();
    }
  }, [activeTab]);

  const handleAddItem = (predefinedName: string) => {
    const existingIndex = items.findIndex(i => i.name === predefinedName);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      setItems(newItems);
    } else {
      const pItem = PREDEFINED_ITEMS.find(p => p.name === predefinedName);
      if (pItem) {
        setItems([...items, { name: pItem.name, price: pItem.defaultPrice, quantity: 1 }]);
      }
    }
  };

  const handleUpdateItem = (index: number, field: keyof MinibarItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalRevenue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  
  const handleDeleteReport = async (report: any) => {
    try {
      if (report.manualLogs) {
        for (const log of report.manualLogs) {
          await deleteRecord('minibar', log.id);
        }
      }
      if (report.preCheckIn) {
        const updatedPre = { ...report.preCheckIn, minibarStock: [], minibarConsumed: [], totalMinibar: 0 };
        await saveRecord('pre_checkin', report.bookingId || report.id, updatedPre);
      }
      if (report.postCheckOut) {
        const updatedPost = { ...report.postCheckOut, minibarConsumed: [], totalMinibar: 0 };
        await saveRecord('post_checkout', report.bookingId || report.id, updatedPost);
      }
      // Manual logs are hard-deleted above and the minibarConsumed/minibarStock
      // fields on the pre_checkin/post_checkout docs are cleared to empty right
      // above this — that's a real delete of all the minibar data for this
      // booking, so it will naturally stop appearing in this table on the next
      // fetch (see the hasMinibarActivity filter in fetchTrackingReports).
      setReports(prev => prev.filter(r => r.bookingId !== report.bookingId));
      setIsConfirmingDelete(null);
      setToast({ message: 'Minibar record deleted successfully.', type: 'success' });
    } catch (e) {
      console.error(e);
      alert("Failed to delete minibar log.");
    }
  };

  const handleSubmit = async () => {
    if (!selectedComplex || !selectedUnit || items.length === 0) return;
    setIsSubmitting(true);
    try {
      const recordId = `mb_${Date.now()}`;
      await saveRecord('minibar', recordId, {
        id: recordId,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.username || currentUser?.name || 'Unknown',
        complexName: selectedComplex,
        unitName: selectedUnit,
        bookingId: selectedGuestId || `manual-${Date.now()}`,
        items,
        totalRevenue,
        notes
      });
      setItems([]);
      setNotes('');
      alert("Minibar charges posted successfully!");
    } catch (e) {
      alert("Failed to post minibar charges");
    } finally {
      setIsSubmitting(false);
    }
  };


  const calculateAge = (dobString: string) => {
    if (!dobString) return 'N/A';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 'N/A';
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Define headers
    const baseHeaders = [
      "Booking ID", "Guest Name", "Check-in Date", "Check-out Date", "Age", 
      "Nationality", "Qty of Alias", "Ages of Alias", "Complex", "Unit", 
      "Initial Stock Value (Rp)", "Consumed Value (Rp)", "Manual Charges (Rp)", 
      "Total Earned Revenue (Rp)", "Consumed Items Summary"
    ];
    
    const itemHeaders = PREDEFINED_ITEMS.map(item => item.name);
    const allHeaders = [...baseHeaders, ...itemHeaders];
    
    csvContent += allHeaders.join(",") + "\n";
    
    reports.forEach(report => {
      const preVal = report.preCheckIn?.totalMinibar || 0;
      const postVal = report.postCheckOut?.totalMinibar || 0;
      const manualTotal = (report.manualLogs || []).reduce((acc: number, log: any) => acc + (log.totalRevenue || 0), 0);
      const earnedValue = postVal + manualTotal;
      
      const guests = report.guests || [];
      const primaryGuest = guests.find((g:any) => g.status === 'Primary') || guests[0] || {};
      const aliasGuests = guests.filter((g:any) => g.id !== primaryGuest.id && g.status !== 'Primary');
      
      const guestName = (report.guestName || primaryGuest.fullName || 'Unknown').replace(/"/g, '""');
      const checkInDate = report.checkInDate || primaryGuest.checkInDate || '';
      const checkOutDate = report.checkOutDate || primaryGuest.checkOutDate || '';
      const age = primaryGuest.dob ? calculateAge(primaryGuest.dob) : 'N/A';
      const nationality = (primaryGuest.nationality || '').replace(/"/g, '""');
      const qtyOfAlias = guests.length > 0 ? guests.length - 1 : 0;
      const agesOfAlias = aliasGuests.map((g:any) => g.dob ? calculateAge(g.dob) : 'N/A').join('; ');

      const complex = (report.complexName || '').replace(/"/g, '""');
      const unit = (report.unitName || '').replace(/"/g, '""');
      
      const consumedItems: string[] = [];
      const itemQuantities: Record<string, number> = {};
      PREDEFINED_ITEMS.forEach(item => { itemQuantities[item.name] = 0; });

      if (report.postCheckOut?.minibarConsumed) {
        report.postCheckOut.minibarConsumed.forEach((i:any) => {
          if (i.qtyConsumed > 0) {
            consumedItems.push(`${i.qtyConsumed}x ${i.name}`);
            if (itemQuantities[i.name] !== undefined) {
              itemQuantities[i.name] += i.qtyConsumed;
            }
          }
        });
      }
      (report.manualLogs || []).forEach((log:any) => {
        (log.items || []).forEach((i:any) => {
          if (i.quantity > 0) {
            consumedItems.push(`${i.quantity}x ${i.name} (Manual)`);
            if (itemQuantities[i.name] !== undefined) {
              itemQuantities[i.name] += i.quantity;
            }
          }
        });
      });
      const consumedItemsStr = consumedItems.join(', ').replace(/"/g, '""');
      
      const baseRow = [
        report.bookingId,
        `"${guestName}"`,
        `"${checkInDate}"`,
        `"${checkOutDate}"`,
        age,
        `"${nationality}"`,
        qtyOfAlias,
        `"${agesOfAlias}"`,
        `"${complex}"`,
        `"${unit}"`,
        preVal,
        postVal,
        manualTotal,
        earnedValue,
        `"${consumedItemsStr}"`
      ];

      const itemRow = PREDEFINED_ITEMS.map(item => itemQuantities[item.name]);
      const allRow = [...baseRow, ...itemRow];
      
      csvContent += allRow.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `minibar_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-8">
        {!isSupervisor && (
          <button 
            onClick={onBackToHome}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
          <Coffee className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isSupervisor ? 'Minibar Manual Entry' : 'Minibar Management'}
            </h1>
            {isSupervisor && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                Supervisor Access
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1 font-medium">
            {isSupervisor 
              ? 'Post and record consumed minibar items for your assigned villas.' 
              : 'Track consumption, earned values, and post charges.'}
          </p>
        </div>
      </div>

      {!isSupervisor && (
        <div className="flex gap-4 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('tracking')}
            className={`pb-3 text-sm font-bold tracking-widest uppercase transition-colors relative ${
              activeTab === 'tracking' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Tracking & Reports
            {activeTab === 'tracking' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`pb-3 text-sm font-bold tracking-widest uppercase transition-colors relative ${
              activeTab === 'log' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Manual Entry
            {activeTab === 'log' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            className="ml-auto inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-medium">Loading minibar tracking data...</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">No tracking records found. Complete a pre-check-in or post-check-out to see data here.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Booking & Location</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50">Stock vs Consumption Bridge</th>
                    <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Earned / Lost Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((report, idx) => {
                    const preVal = report.preCheckIn?.totalMinibar || 0;
                    const postVal = report.postCheckOut?.totalMinibar || 0;
                    
                    let manualTotal = 0;
                    if (report.manualLogs) {
                      manualTotal = report.manualLogs.reduce((acc: number, log: any) => acc + (log.totalRevenue || 0), 0);
                    }

                    const earnedValue = postVal + manualTotal;
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {getInitials(report.guestName)}
                              </div>
                              <div>
                                <span className="text-sm font-bold text-slate-900 block">{report.guestName || 'Unknown Guest'}</span>
                                <span className="text-xs text-slate-500 block mb-2">{report.complexName} - {report.unitName}</span>
                                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ID: {report.bookingId}</div>
                              </div>
                            </div>
                                                        {currentUser?.role === 'admin' && (
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleEditReport(report)} 
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                                  title="Edit Record"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {canDelete && (
                                  isConfirmingDelete === report.bookingId ? (
                                    <div className="flex items-center gap-1 ml-1 bg-rose-50 rounded px-2 py-1">
                                      <span className="text-[10px] text-rose-600 font-medium">Delete?</span>
                                      <button onClick={() => handleDeleteReport(report)} className="p-1 bg-rose-600 text-white rounded text-[10px] font-bold">Yes</button>
                                      <button onClick={() => setIsConfirmingDelete(null)} className="p-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">No</button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => setIsConfirmingDelete(report.bookingId)} 
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" 
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 align-top bg-slate-50/30">
                          {(() => {
                             const itemNames = new Set<string>();
                             report.preCheckIn?.minibarStock?.forEach((i:any) => itemNames.add(i.name));
                             report.preCheckIn?.minibarConsumed?.forEach((i:any) => itemNames.add(i.name));
                             report.postCheckOut?.minibarConsumed?.forEach((i:any) => itemNames.add(i.name));
                             
                             const sortedManualLogs = [...(report.manualLogs || [])].sort((a: any, b: any) => 
                               new Date(a.createdAt || a.timestamp).getTime() - new Date(b.createdAt || b.timestamp).getTime()
                             );
                             
                             sortedManualLogs.forEach((log:any) => log.items?.forEach((i:any) => itemNames.add(i.name)));
                             
                             const formatManualDate = (dateStr: string) => {
                               if (!dateStr) return "MANUAL";
                               const d = new Date(dateStr);
                               if (isNaN(d.getTime())) return "MANUAL";
                               const dd = String(d.getDate()).padStart(2, '0');
                               const mm = String(d.getMonth() + 1).padStart(2, '0');
                               const yy = String(d.getFullYear()).slice(-2);
                               const hh = String(d.getHours()).padStart(2, '0');
                               const mins = String(d.getMinutes()).padStart(2, '0');
                               return `MANUAL ${dd}${mm}${yy} ${hh}:${mins}`;
                             };

                             const bridgedItems = Array.from(itemNames).map(name => {
                               const preItem = report.preCheckIn?.minibarStock?.find((i:any) => i.name === name) || report.preCheckIn?.minibarConsumed?.find((i:any) => i.name === name);
                               const postItem = report.postCheckOut?.minibarConsumed?.find((i:any) => i.name === name);
                               
                               const manualQuantities = sortedManualLogs.map((log:any) => {
                                 const mItem = log.items?.find((i:any) => i.name === name);
                                 return mItem ? mItem.quantity : 0;
                               });

                               let manualPrice = 0;
                               sortedManualLogs.forEach((log:any) => {
                                 const mItem = log.items?.find((i:any) => i.name === name);
                                 if (mItem) manualPrice = mItem.price;
                               });

                               const price = preItem?.price || postItem?.price || manualPrice || 0;
                               const initial = preItem?.qtyStock !== undefined ? preItem.qtyStock : (preItem?.qtyConsumed || 0);
                               const postOutConsumed = postItem?.qtyConsumed || 0;
                               const totalConsumed = postOutConsumed + manualQuantities.reduce((a,b) => a+b, 0);
                               
                               return { name, initial, postOutConsumed, manualQuantities, totalConsumed, price, value: totalConsumed * price };
                             });

                             return (
                               <div className="flex flex-col gap-3">
                                 <div className="flex gap-4 mb-2">
                                    <div className="flex-1 bg-white p-2 rounded border border-slate-200">
                                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Pre-Check-In Log</div>
                                      {report.preCheckIn ? (
                                        <div className="flex flex-col gap-1">
                                          <div className="text-xs font-medium text-slate-700 flex items-center justify-between">
                                            <span>{new Date(report.preCheckIn.timestamp).toLocaleDateString()}</span>
                                            {report.preCheckIn.minibarPhoto && (
                                              <a href={report.preCheckIn.minibarPhoto} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                <Camera className="w-3 h-3" /> Photo
                                              </a>
                                            )}
                                          </div>
                                          {report.preCheckIn.createdBy && (
                                            <div className="text-[9px] text-slate-500 italic">By {report.preCheckIn.createdBy}</div>
                                          )}
                                        </div>
                                      ) : <span className="text-xs text-amber-600">No Data</span>}
                                    </div>
                                    <div className="flex-1 bg-white p-2 rounded border border-slate-200">
                                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Post-Check-Out Log</div>
                                      {report.postCheckOut ? (
                                        <div className="flex flex-col gap-1">
                                          <div className="text-xs font-medium text-slate-700 flex items-center justify-between">
                                            <span>{new Date(report.postCheckOut.timestamp).toLocaleDateString()}</span>
                                            {report.postCheckOut.minibarPhoto && (
                                              <a href={report.postCheckOut.minibarPhoto} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline flex items-center gap-1">
                                                <Camera className="w-3 h-3" /> Photo
                                              </a>
                                            )}
                                          </div>
                                          {report.postCheckOut.createdBy && (
                                            <div className="text-[9px] text-slate-500 italic">By {report.postCheckOut.createdBy}</div>
                                          )}
                                        </div>
                                      ) : <span className="text-xs text-slate-400">Pending</span>}
                                    </div>
                                 </div>
                                 
                                 {bridgedItems.length > 0 ? (
                                   <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
                                     <table className="w-full text-left text-xs">
                                       <thead className="bg-slate-100 text-[10px] uppercase text-slate-500">
                                         <tr>
                                           <th className="px-2 py-1.5 font-bold">Item</th>
                                           <th className="px-2 py-1.5 font-bold text-center">Initial Stock</th>
                                           <th className="px-2 py-1.5 font-bold text-center whitespace-nowrap bg-slate-200">Total Cons.</th>
                                           <th className="px-2 py-1.5 font-bold text-center whitespace-nowrap">Post-Checkout</th>
                                           {sortedManualLogs.map((log:any, idx:number) => (
                                              <th key={idx} className="px-2 py-1.5 font-bold text-center text-blue-600 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                  <span>{formatManualDate(log.createdAt || log.timestamp)}</span>
                                                  {log.createdBy && <span className="text-[8px] font-normal text-slate-400 normal-case italic">by {log.createdBy}</span>}
                                                </div>
                                              </th>
                                           ))}
                                           <th className="px-2 py-1.5 font-bold text-right">Value (Rp)</th>
                                         </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100">
                                         {bridgedItems.map((item, i) => (
                                           <tr key={i} className="hover:bg-slate-50">
                                             <td className="px-2 py-1.5 font-medium text-slate-700">{item.name}</td>
                                             <td className="px-2 py-1.5 text-center text-slate-600">{item.initial || '-'}</td>
                                             <td className="px-2 py-1.5 text-center text-rose-700 font-bold bg-rose-50/50">{item.totalConsumed > 0 ? `-${item.totalConsumed}` : '-'}</td>
                                             <td className="px-2 py-1.5 text-center text-slate-500 font-medium">{item.postOutConsumed > 0 ? `-${item.postOutConsumed}` : '-'}</td>
                                             {item.manualQuantities.map((q:number, idx:number) => (
                                                <td key={idx} className="px-2 py-1.5 text-center text-blue-600 font-medium">{q > 0 ? `-${q}` : '-'}</td>
                                             ))}
                                             <td className="px-2 py-1.5 text-right font-medium text-slate-900">{item.value > 0 ? item.value.toLocaleString('id-ID') : '-'}</td>
                                           </tr>
                                         ))}
                                       </tbody>
                                     </table>
                                   </div>
                                 ) : (
                                   <div className="text-xs text-slate-400 italic">No minibar items tracked for this booking.</div>
                                 )}
                               </div>
                             );
                          })()}
                        </td>

                        <td className="px-4 py-4 align-top text-right">
                          <div className="flex flex-col items-end">
                            <span className={`px-3 py-1.5 rounded-lg text-sm font-bold tracking-wide shadow-sm border ${
                              earnedValue > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              Rp {earnedValue.toLocaleString('id-ID')}
                            </span>
                            {earnedValue > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-2 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Earned Revenue
                              </span>
                            )}
                            {report.manualLogs && report.manualLogs.length > 0 && (
                              <div className="mt-2 text-[10px] text-blue-500 font-bold uppercase text-right">
                                Includes {report.manualLogs.length} manual entry(s)
                              </div>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'log' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Location</h2>
                            <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Guest (Last 5 Days)</label>
                <select
                  value={selectedGuestId}
                  onChange={(e) => {
                    const gId = e.target.value;
                    setSelectedGuestId(gId);
                    if (gId) {
                      const guest = recentGuests.find(g => (g.bookingId || g.id) === gId);
                      if (guest) {
                        if (guest.complexName) setSelectedComplex(guest.complexName);
                        if (guest.unitName) setSelectedUnit(guest.unitName);
                      }
                    }
                  }}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-700"
                >
                  <option value="">-- Select Guest --</option>
                  {recentGuests.map(g => (
                    <option key={g.id} value={g.bookingId || g.id}>{g.fullName} ({new Date(g.createdAt || g.checkInDate || g.timestamp).toLocaleDateString()}) - {g.complexName} {g.unitName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Complex / Villa</label>
                  <select
                    value={selectedComplex}
                    onChange={(e) => {
                      setSelectedComplex(e.target.value);
                      setSelectedUnit('');
                    }}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-700"
                  >
                    <option value="">Select Complex</option>
                    {complexes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Unit</label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    disabled={!selectedComplex}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-700 disabled:opacity-50"
                  >
                    <option value="">Select Unit</option>
                    {(unitsByComplex[selectedComplex] || []).map(u => (
                      <option key={u} value={u.replace(`${selectedComplex} - `, '')}>{u.replace(`${selectedComplex} - `, '')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Consumed Items</h2>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {PREDEFINED_ITEMS.map(item => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleAddItem(item.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full text-sm font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {item.name}
                  </button>
                ))}
              </div>

              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                          placeholder="Item name"
                          className="w-full p-2 bg-white border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      </div>
                      <div className="w-full sm:w-32">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleUpdateItem(idx, 'price', parseInt(e.target.value) || 0)}
                          placeholder="Price (Rp)"
                          className="w-full p-2 bg-white border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-right"
                        />
                      </div>
                      <div className="w-full sm:w-24">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          placeholder="Qty"
                          className="w-full p-2 bg-white border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors w-full sm:w-auto flex justify-center"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 font-medium bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Select items above to add to consumption log
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-600 rounded-xl shadow-md text-white p-6 sticky top-6">
              <h2 className="text-blue-200 font-bold uppercase tracking-widest text-xs mb-6">Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center border-b border-blue-500/50 pb-4">
                  <span className="text-blue-100">Location</span>
                  <span className="font-bold text-right">
                    {selectedComplex ? `${selectedComplex} ${selectedUnit ? `- ${selectedUnit}` : ''}` : 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-blue-500/50 pb-4">
                  <span className="text-blue-100">Total Items</span>
                  <span className="font-bold">{items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-blue-100 font-medium">Total Charge</span>
                  <span className="text-2xl font-extrabold tracking-tight">
                    Rp {totalRevenue.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!selectedComplex || !selectedUnit || items.length === 0 || isSubmitting}
                className="w-full py-3.5 bg-white text-blue-700 font-bold rounded-lg shadow-sm hover:bg-blue-50 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Processing...</span>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Post Manual Charges
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {editingReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900">Admin Edit: Minibar Record</h3>
                <div className="text-xs text-slate-500">{editingReport.guestName} ({editingReport.bookingId})</div>
              </div>
              <button onClick={() => setEditingReport(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-[10px] uppercase text-slate-500 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold bg-slate-100 sticky left-0 z-20">Item</th>
                    <th className="px-4 py-3 font-bold text-center whitespace-nowrap bg-slate-100">
                      Initial Stock<br/>
                      <span className="text-[9px] font-normal">(Pre-CheckIn)</span>
                      {editingReport.preCheckIn?.createdBy && (
                        <div className="text-[8px] font-normal text-slate-400 normal-case italic">by {editingReport.preCheckIn.createdBy}</div>
                      )}
                    </th>
                    <th className="px-4 py-3 font-bold text-center whitespace-nowrap bg-slate-100">
                      Checkout Cons.<br/>
                      <span className="text-[9px] font-normal">(Post-CheckOut)</span>
                      {editingReport.postCheckOut?.createdBy && (
                        <div className="text-[8px] font-normal text-slate-400 normal-case italic">by {editingReport.postCheckOut.createdBy}</div>
                      )}
                    </th>
                    {(editingReport.manualLogs || []).sort((a:any, b:any) => new Date(a.createdAt || a.timestamp).getTime() - new Date(b.createdAt || b.timestamp).getTime()).map((log:any, idx:number) => {
                      const d = new Date(log.createdAt || log.timestamp);
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const hh = String(d.getHours()).padStart(2, '0');
                      const mins = String(d.getMinutes()).padStart(2, '0');
                      return (
                        <th key={log.id} className="px-4 py-3 font-bold text-center whitespace-nowrap text-blue-600 bg-slate-100 border-l border-slate-200">
                          <div className="flex flex-col">
                            <span>Manual Entry</span>
                            <span className="text-[9px] font-normal">{dd}/{mm} {hh}:{mins}</span>
                            {log.createdBy && <span className="text-[8px] font-normal text-slate-400 normal-case italic">by {log.createdBy}</span>}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PREDEFINED_ITEMS.map(item => (
                    <tr key={item.name} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-700 text-xs bg-white sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9]">{item.name}</td>
                      <td className="px-4 py-2 text-center bg-white">
                         <input 
                           type="number" 
                           min="0"
                           className="w-14 p-1.5 text-center border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={editFormData[item.name]?.initial ?? ''}
                           onChange={(e) => setEditFormData(prev => ({...prev, [item.name]: { ...prev[item.name], initial: parseInt(e.target.value) || 0 }}))}
                           title={!editingReport.preCheckIn ? "Will create Pre-Check-In record" : ""}
                         />
                      </td>
                      <td className="px-4 py-2 text-center bg-white">
                         <input 
                           type="number" 
                           min="0"
                           className="w-14 p-1.5 text-center border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={editFormData[item.name]?.postOut ?? ''}
                           onChange={(e) => setEditFormData(prev => ({...prev, [item.name]: { ...prev[item.name], postOut: parseInt(e.target.value) || 0 }}))}
                           title={!editingReport.postCheckOut ? "Will create Post-Check-Out record" : ""}
                         />
                      </td>
                      {(editingReport.manualLogs || []).sort((a:any, b:any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((log:any) => (
                        <td key={log.id} className="px-4 py-2 text-center bg-blue-50/30 border-l border-slate-200">
                           <input 
                             type="number" 
                             min="0"
                             className="w-14 p-1.5 text-center border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                             value={editFormData[item.name]?.manual?.[log.id] ?? ''}
                             onChange={(e) => setEditFormData(prev => ({
                               ...prev, 
                               [item.name]: { 
                                 ...prev[item.name], 
                                 manual: {
                                   ...(prev[item.name]?.manual || {}),
                                   [log.id]: parseInt(e.target.value) || 0
                                 }
                               }
                             }))}
                           />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setEditingReport(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Save Adjustments</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
