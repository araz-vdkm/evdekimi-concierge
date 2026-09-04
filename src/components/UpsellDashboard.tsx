import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/auth';
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
  Mail
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface UpsellDashboardProps {
  currentUser?: UserAccount | null;
  onBackToHome?: () => void;
}

/**
 * Upsell Opportunities page.
 * Lists guests for whom Guest Insights (AI) has generated an upsell
 * suggestion, sourced live from the Firestore `guests` collection.
 * Visible only to admin and frontdesk roles (gated in App.tsx).
 */
export default function UpsellDashboard({ currentUser, onBackToHome }: UpsellDashboardProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredGuests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) =>
        (g.fullName || '').toLowerCase().includes(q) ||
        (g.complexName || '').toLowerCase().includes(q) ||
        (g.unitName || '').toLowerCase().includes(q) ||
        (g.nationality || '').toLowerCase().includes(q)
    );
  }, [guests, searchTerm]);

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
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search guests by name or villa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
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
            <p className="text-sm">Guests appear here once Guest Insights suggests an upsell for them.</p>
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
                    <th className="px-6 py-4 font-semibold text-violet-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> AI Upsell Suggestions
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {filteredGuests.map((g, idx) => (
                    <tr key={g.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">{renderPhoto(g, 'w-12 h-12')}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-base mb-0.5">{g.fullName || 'Unknown Guest'}</div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {g.nationality || 'N/A'}
                          </span>
                          {g.purpose && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{g.purpose}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800 mb-0.5">{g.complexName || '—'}</div>
                        <div className="text-xs text-slate-500">{g.unitName || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-medium text-xs">{g.checkInDate || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-xs">{g.checkOutDate || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 mb-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {g.contactNumber || '—'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 break-all">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {g.contactEmail || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="bg-violet-50 border border-violet-100 text-violet-800 text-xs leading-relaxed p-2.5 rounded-lg">
                          {g.upsell}
                        </div>
                      </td>
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
                      <h3 className="font-bold text-slate-900 truncate text-base mb-1">{g.fullName || 'Unknown Guest'}</h3>
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

                      <div className="mt-3 bg-violet-50 border border-violet-100 text-violet-800 text-xs leading-relaxed p-2.5 rounded-lg flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{g.upsell}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
