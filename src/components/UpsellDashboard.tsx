import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/auth';
import { saveRecord } from '../lib/db';
import { Guest, UserAccount } from '../types';
import { isReservationAssignedToUser } from '../lib/villaMatcher';
import { normalizeCountryName } from '../lib/utils';
import {
  Sparkles,
  Search,
  Download,
  RefreshCcw,
  ChevronLeft,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Mail,
  UserCheck,
  Home,
  CheckCircle2,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface UpsellDashboardProps {
  currentUser?: UserAccount | null;
  onBackToHome?: () => void;
}

type UpsellItemStatus = 'pending' | 'done' | 'rejected';

interface UpsellItemRecord {
  guestId: string;
  itemIndex: number;
  itemText: string;
  status: UpsellItemStatus;
  price?: string;
  commission?: string;
  serviceNotes?: string;
  guestName?: string;
  complexName?: string;
  unitName?: string;
  handledBy?: string;
  updatedAt?: string;
}

/**
 * Upsell Opportunities page.
 * Lists guests for whom Guest Insights (AI) has generated an upsell
 * suggestion, sourced live from the Firestore `guests` collection.
 * Each suggestion is tracked individually (Pending / Done / Rejected)
 * in the `upsell_items` collection, keyed deterministically per guest
 * + item index so status toggles never clobber previously saved
 * price/commission/notes.
 * Visible only to admin and frontdesk roles (gated in App.tsx).
 */
export default function UpsellDashboard({ currentUser, onBackToHome }: UpsellDashboardProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, UpsellItemRecord>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | UpsellItemStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [doneModal, setDoneModal] = useState<{ guest: Guest; index: number; itemText: string } | null>(null);
  const [doneForm, setDoneForm] = useState({ price: '', commission: '', serviceNotes: '' });
  const [isSavingDone, setIsSavingDone] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    let unsub: any;
    try {
      unsub = onSnapshot(
        collection(db, 'guests'),
        (snap) => {
          const withUpsell: Guest[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data() as any;
            const upsellText =
              typeof data.upsell === 'string'
                ? data.upsell
                : data.upsell
                ? Object.entries(data.upsell).map(([k, v]) => `${k}: ${v}`).join(', ')
                : '';
            if (upsellText && upsellText.trim() !== '') {
              withUpsell.push({
                ...data,
                id: docSnap.id,
                upsell: upsellText,
                nationality: normalizeCountryName(data.nationality)
              });
            }
          });

          const assigned = withUpsell.filter((g) => isReservationAssignedToUser(g, currentUser));
          assigned.sort((a, b) => new Date(b.checkInDate || 0).getTime() - new Date(a.checkInDate || 0).getTime());
          setGuests(assigned);
          setIsLoading(false);
        },
        (err) => {
          console.warn('Upsell guests snapshot notice:', err);
          setIsLoading(false);
        }
      );
    } catch (e) {
      console.warn('Failed to subscribe to guests for Upsell dashboard:', e);
      setIsLoading(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, [currentUser]);

  useEffect(() => {
    let unsub: any;
    try {
      unsub = onSnapshot(
        collection(db, 'upsell_items'),
        (snap) => {
          const map: Record<string, UpsellItemRecord> = {};
          snap.forEach((docSnap) => {
            map[docSnap.id] = docSnap.data() as UpsellItemRecord;
          });
          setItemsMap(map);
        },
        (err) => {
          console.warn('Upsell items snapshot notice:', err);
        }
      );
    } catch (e) {
      console.warn('Failed to subscribe to upsell_items:', e);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const getUpsellItems = (g: Guest): string[] =>
    (g.upsell || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const getItemRecord = (guestId: string, index: number, itemText: string): UpsellItemRecord => {
    const key = `${guestId}_item_${index}`;
    return itemsMap[key] || { guestId, itemIndex: index, itemText, status: 'pending' };
  };

  const parseDateOnly = (s?: string) => {
    if (!s) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const isGuestActive = (g: Guest) => {
    const ci = parseDateOnly(g.checkInDate);
    const co = parseDateOnly(g.checkOutDate);
    if (!ci || !co) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ci.getTime() <= today.getTime() && co.getTime() >= today.getTime();
  };

  const searchAndDateFiltered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return guests.filter((g) => {
      if (q) {
        const matchesSearch =
          (g.fullName || '').toLowerCase().includes(q) ||
          (g.complexName || '').toLowerCase().includes(q) ||
          (g.unitName || '').toLowerCase().includes(q) ||
          (g.nationality || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Date range filter: keep guests whose stay overlaps the selected range
      if (dateFrom && (!g.checkOutDate || g.checkOutDate < dateFrom)) return false;
      if (dateTo && (!g.checkInDate || g.checkInDate > dateTo)) return false;

      return true;
    });
  }, [guests, searchTerm, dateFrom, dateTo]);

  const activeGuestsCount = useMemo(
    () => searchAndDateFiltered.filter((g) => isGuestActive(g)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchAndDateFiltered]
  );

  const filteredGuests = useMemo(() => {
    return searchAndDateFiltered.filter((g) => {
      if (activeOnly && !isGuestActive(g)) return false;

      if (statusFilter !== 'all') {
        const items = getUpsellItems(g);
        const hasMatch = items.some((text, idx) => getItemRecord(g.id, idx, text).status === statusFilter);
        if (!hasMatch) return false;
      }

      return true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [searchAndDateFiltered, activeOnly, statusFilter, itemsMap]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event('refresh-data'));
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  const handleExportXLSX = () => {
    if (filteredGuests.length === 0) {
      alert('No upsell opportunities to export.');
      return;
    }
    const exportData = filteredGuests.map((g) => ({
      'Full Name': g.fullName || '',
      'Nationality': g.nationality || '',
      'Complex Name': g.complexName || '',
      'Unit Name': g.unitName || '',
      'Purpose of Visit': g.purpose || '',
      'Check-In Date': g.checkInDate || '',
      'Check-Out Date': g.checkOutDate || '',
      'Phone Number': g.contactNumber || '',
      'Email Address': g.contactEmail || '',
      'Upsell Opportunities': g.upsell || ''
    }));
    try {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Upsell Opportunities');
      XLSX.writeFile(workbook, `Upsell_Opportunities_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error('Export XLSX error:', e);
      alert('Failed to export. Check console.');
    }
  };

  const handleSetStatus = async (g: Guest, index: number, itemText: string, status: UpsellItemStatus) => {
    const key = `${g.id}_item_${index}`;
    const existing = itemsMap[key];
    try {
      await saveRecord('upsell_items', key, {
        guestId: g.id,
        itemIndex: index,
        itemText,
        status,
        price: existing?.price || '',
        commission: existing?.commission || '',
        serviceNotes: existing?.serviceNotes || '',
        guestName: g.fullName || '',
        complexName: g.complexName || '',
        unitName: g.unitName || '',
        handledBy: currentUser?.username || currentUser?.email || 'Staff'
      });
    } catch (e) {
      console.error('Failed to update upsell item status:', e);
      alert('Failed to update status. Check console.');
    }
  };

  const openDoneModal = (g: Guest, index: number, itemText: string) => {
    const key = `${g.id}_item_${index}`;
    const existing = itemsMap[key];
    setDoneForm({
      price: existing?.price || '',
      commission: existing?.commission || '',
      serviceNotes: existing?.serviceNotes || ''
    });
    setDoneModal({ guest: g, index, itemText });
  };

  const handleSaveDone = async () => {
    if (!doneModal) return;
    setIsSavingDone(true);
    const { guest: g, index, itemText } = doneModal;
    const key = `${g.id}_item_${index}`;
    try {
      await saveRecord('upsell_items', key, {
        guestId: g.id,
        itemIndex: index,
        itemText,
        status: 'done',
        price: doneForm.price.trim(),
        commission: doneForm.commission.trim(),
        serviceNotes: doneForm.serviceNotes.trim(),
        guestName: g.fullName || '',
        complexName: g.complexName || '',
        unitName: g.unitName || '',
        handledBy: currentUser?.username || currentUser?.email || 'Staff'
      });
      setDoneModal(null);
    } catch (e) {
      console.error('Failed to save completed upsell:', e);
      alert('Failed to save. Check console.');
    } finally {
      setIsSavingDone(false);
    }
  };

  const renderPhoto = (g: Guest, sizeClass: string) =>
    g.photo ? (
      <img
        src={g.photo.startsWith('http') || g.photo.startsWith('data:') ? g.photo : `data:image/jpeg;base64,${g.photo}`}
        alt="Guest"
        className={`${sizeClass} rounded-full object-cover border-2 border-white shadow-sm`}
      />
    ) : (
      <div className={`${sizeClass} rounded-full bg-violet-100 border-2 border-white shadow-sm flex items-center justify-center text-violet-600 font-bold`}>
        {g.fullName?.charAt(0) || '?'}
      </div>
    );

  const renderUpsellItems = (g: Guest) => {
    const items = getUpsellItems(g);
    if (items.length === 0) {
      return <span className="text-xs text-slate-400 italic">No suggestions</span>;
    }
    return (
      <div className="flex flex-col gap-1.5 min-w-[220px]">
        {items.map((itemText, idx) => {
          const record = getItemRecord(g.id, idx, itemText);
          const status = record.status;
          const hasDoneDetails = status === 'done' && (record.price || record.commission || record.serviceNotes);
          return (
            <div key={idx} className="bg-violet-50 border border-violet-100 rounded-lg p-2">
              <div className="flex items-start gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
                <span className="text-xs text-violet-900 leading-snug font-medium">{itemText}</span>
              </div>
              {hasDoneDetails && (
                <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-1 mb-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                  {record.price && <span>💵 {record.price}</span>}
                  {record.commission && <span>Commission: {record.commission}</span>}
                  {record.serviceNotes && <span className="w-full truncate" title={record.serviceNotes}>{record.serviceNotes}</span>}
                </div>
              )}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSetStatus(g, idx, itemText, 'pending')}
                  className={`flex-1 text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                    status === 'pending'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-amber-50'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => openDoneModal(g, idx, itemText)}
                  className={`flex-1 text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                    status === 'done'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-emerald-50'
                  }`}
                >
                  Done
                </button>
                <button
                  onClick={() => handleSetStatus(g, idx, itemText, 'rejected')}
                  className={`flex-1 text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                    status === 'rejected'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-rose-50'
                  }`}
                >
                  Rejected
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBackToHome}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Upsell Opportunities</h1>
          <p className="text-slate-500 mt-1 font-medium">AI-recommended add-ons for guests currently on property.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-50 gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-1 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search guests by name or villa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              />
            </div>
            <button
              onClick={() => setActiveOnly((v) => !v)}
              className={`text-sm px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm border shrink-0 ${
                activeOnly
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Show only guests currently staying with us"
            >
              <UserCheck className="w-4 h-4" /> Active Guests Only
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeOnly ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {activeGuestsCount}
              </span>
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | UpsellItemStatus)}
              className="text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 shrink-0"
            >
              <option value="all">All Upsell Statuses</option>
              <option value="pending">Pending</option>
              <option value="done">Done</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm shrink-0">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm text-slate-600 focus:outline-none bg-transparent w-[124px]"
                title="Stay overlaps from this date"
              />
              <span className="text-slate-300">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm text-slate-600 focus:outline-none bg-transparent w-[124px]"
                title="Stay overlaps until this date"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
            <button
              onClick={handleRefresh}
              className="p-2 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
              title="Refresh"
            >
              <RefreshCcw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
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
            <RefreshCcw className="w-8 h-8 animate-spin text-violet-500" />
            <p className="font-medium">Loading upsell opportunities...</p>
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <Sparkles className="w-12 h-12 text-slate-300" />
            <p className="font-medium text-lg">No upsell opportunities found</p>
            <p className="text-sm">Try adjusting your filters, or check back once Guest Insights suggests an upsell.</p>
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
                    <th className="px-6 py-4 font-semibold text-violet-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> AI Upsell Suggestions
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {filteredGuests.map((g, idx) => (
                    <tr key={g.id || idx} className="hover:bg-slate-50 transition-colors align-top">
                      <td className="px-6 py-4">{renderPhoto(g, 'w-12 h-12')}</td>
                      <td className="px-6 py-4 max-w-sm">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                          <span className="font-bold text-slate-900 text-base">{g.fullName || 'Unknown Guest'}</span>
                          {isGuestActive(g) && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                              Staying
                            </span>
                          )}
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <MapPin className="w-3 h-3" /> {g.nationality || 'N/A'}
                          </span>
                          {g.purpose && (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">{g.purpose}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Home className="w-3 h-3 text-violet-400" /> {g.complexName || '—'}
                            {g.unitName ? ` · ${g.unitName}` : ''}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <Calendar className="w-3 h-3" /> {g.checkInDate || '—'}
                          </span>
                          <span className="flex items-center gap-1 text-rose-500 font-medium">
                            <Clock className="w-3 h-3" /> {g.checkOutDate || '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> {g.contactNumber || '—'}
                          </span>
                          <span className="flex items-center gap-1 break-all">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {g.contactEmail || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">{renderUpsellItems(g)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block lg:hidden flex-col divide-y divide-slate-100">
              {filteredGuests.map((g, idx) => (
                <div key={g.id || idx} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex gap-4">
                    <div className="shrink-0">{renderPhoto(g, 'w-14 h-14')}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="font-bold text-slate-900 truncate text-base">{g.fullName || 'Unknown Guest'}</h3>
                        {isGuestActive(g) && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full shrink-0">
                            Staying
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium mb-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {g.nationality || 'N/A'}
                        </span>
                        {g.purpose && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">{g.purpose}</span>
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Accommodation</div>
                          <div className="text-sm font-medium text-slate-800">{g.unitName || '—'}</div>
                          <div className="text-xs text-slate-500 truncate">{g.complexName || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Dates</div>
                          <div className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {g.checkInDate || '—'}
                          </div>
                          <div className="text-xs font-medium text-rose-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {g.checkOutDate || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1 mt-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" /> {g.contactNumber || '—'}
                        </span>
                        <span className="flex items-center gap-1.5 break-all">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {g.contactEmail || '—'}
                        </span>
                      </div>

                      <div className="mt-3">{renderUpsellItems(g)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {doneModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden my-8 animate-in fade-in">
            <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-lg">
                <CheckCircle2 className="w-5 h-5" /> Mark Upsell as Done
              </div>
              <button
                onClick={() => setDoneModal(null)}
                className="text-emerald-200 hover:text-white text-base p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Upsell</div>
                <div className="text-sm text-slate-800 bg-violet-50 border border-violet-100 rounded-lg p-2.5">
                  {doneModal.itemText}
                </div>
                <div className="text-xs text-slate-400 mt-1.5">
                  {doneModal.guest.fullName} · {doneModal.guest.unitName || doneModal.guest.complexName || '—'}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Price <span className="normal-case font-medium text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={doneForm.price}
                  onChange={(e) => setDoneForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. $120"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Our Commission <span className="normal-case font-medium text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={doneForm.commission}
                  onChange={(e) => setDoneForm((f) => ({ ...f, commission: e.target.value }))}
                  placeholder="e.g. $20"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Service Offered <span className="normal-case font-medium text-slate-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={doneForm.serviceNotes}
                  onChange={(e) => setDoneForm((f) => ({ ...f, serviceNotes: e.target.value }))}
                  placeholder="Describe what was arranged for the guest..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDoneModal(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDone}
                  disabled={isSavingDone}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSavingDone ? (
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Save as Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
