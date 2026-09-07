import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/auth';
import { saveRecord } from '../lib/db';
import { UserAccount } from '../types';
import {
  ChevronLeft,
  Calendar,
  Download,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  UserCheck,
  ClipboardCheck,
  ClipboardList,
  Filter,
  History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import UpsellAnalyticsPanel from './UpsellAnalyticsPanel';

interface ReportingDashboardProps {
  currentUser?: UserAccount | null;
  onBackToHome?: () => void;
}

type ActivityType = 'registration' | 'pre_checkin' | 'post_checkout';
type ActivityStatus = 'success' | 'failed';

interface LogEntry {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  guestName?: string;
  bookingId?: string;
  complexName?: string;
  unitName?: string;
  submittedBy?: string;
  errorMessage?: string;
  timestamp?: string;
}

type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'all' | 'custom';

const TYPE_META: Record<ActivityType, { label: string; bg: string; color: string; icon: React.ReactNode; cardIconBg: string; cardIconColor: string }> = {
  registration: { label: 'Registration', bg: '#eff6ff', color: '#2563eb', cardIconBg: '#eff6ff', cardIconColor: '#2563eb', icon: <UserCheck className="w-[19px] h-[19px]" /> },
  pre_checkin: { label: 'Pre-Check-In', bg: '#fffbeb', color: '#b45309', cardIconBg: '#fffbeb', cardIconColor: '#d97706', icon: <ClipboardCheck className="w-[19px] h-[19px]" /> },
  post_checkout: { label: 'Post-Check-Out', bg: '#fdf2f8', color: '#be185d', cardIconBg: '#fdf2f8', cardIconColor: '#db2777', icon: <ClipboardList className="w-[19px] h-[19px]" /> }
};

const CARD_ORDER: { type: ActivityType; title: string }[] = [
  { type: 'registration', title: 'Guest Registrations' },
  { type: 'pre_checkin', title: 'Pre-Check-In Reports' },
  { type: 'post_checkout', title: 'Post-Check-Out Reports' }
];

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' }
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateInputValue(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function ReportingDashboard({ currentUser, onBackToHome }: ReportingDashboardProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'upsell'>('activity');
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);

  const [preset, setPreset] = useState<PeriodPreset>('30d');
  const [customFrom, setCustomFrom] = useState<string>(toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [customTo, setCustomTo] = useState<string>(toDateInputValue(new Date()));

  const [typeFilter, setTypeFilter] = useState<'all' | ActivityType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ActivityStatus>('all');

  useEffect(() => {
    setIsLoading(true);
    let unsub: any;
    try {
      unsub = onSnapshot(
        collection(db, 'activity_logs'),
        (snap) => {
          const list: LogEntry[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data() as any;
            list.push({ id: docSnap.id, ...data });
          });
          list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
          setEntries(list);
          setIsLoading(false);
        },
        (err) => {
          console.warn('Activity log snapshot notice:', err);
          setIsLoading(false);
        }
      );
    } catch (e) {
      console.warn('Failed to subscribe to activity_logs:', e);
      setIsLoading(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (preset) {
      case 'today':
        start = startOfToday();
        end = now;
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case 'all':
        start = null;
        end = null;
        break;
      case 'custom':
        start = customFrom ? new Date(customFrom + 'T00:00:00') : null;
        end = customTo ? new Date(customTo + 'T23:59:59') : now;
        break;
    }
    return { rangeStart: start, rangeEnd: end };
  }, [preset, customFrom, customTo]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (rangeStart || rangeEnd) {
        const t = e.timestamp ? new Date(e.timestamp).getTime() : 0;
        if (rangeStart && t < rangeStart.getTime()) return false;
        if (rangeEnd && t > rangeEnd.getTime()) return false;
      }
      return true;
    });
  }, [entries, typeFilter, statusFilter, rangeStart, rangeEnd]);

  // Stat cards always reflect the date range only (not the type/status filters),
  // so the three totals stay comparable regardless of what the table below is filtered to.
  const dateRangedEntries = useMemo(() => {
    if (!rangeStart && !rangeEnd) return entries;
    return entries.filter((e) => {
      const t = e.timestamp ? new Date(e.timestamp).getTime() : 0;
      if (rangeStart && t < rangeStart.getTime()) return false;
      if (rangeEnd && t > rangeEnd.getTime()) return false;
      return true;
    });
  }, [entries, rangeStart, rangeEnd]);

  const stats = useMemo(() => {
    const byType: Record<ActivityType, { total: number; success: number; failed: number }> = {
      registration: { total: 0, success: 0, failed: 0 },
      pre_checkin: { total: 0, success: 0, failed: 0 },
      post_checkout: { total: 0, success: 0, failed: 0 }
    };
    dateRangedEntries.forEach((e) => {
      if (!byType[e.type]) return;
      byType[e.type].total++;
      if (e.status === 'success') byType[e.type].success++;
      else if (e.status === 'failed') byType[e.type].failed++;
    });
    return byType;
  }, [dateRangedEntries]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // One-time (idempotent) import of historical Check-In / Pre-Check-In /
  // Post-Check-Out records that existed before activity logging was added,
  // so the report isn't empty for everything that happened previously.
  // Deterministic doc IDs mean running this again just re-merges the same
  // entries instead of duplicating them. Only successful attempts left a
  // trace in the old data, except guest registrations, where a 'status' of
  // 'In Queue' already meant the passport scan step failed at the time.
  const handleBackfill = async () => {
    if (!confirm('Import historical Check-In, Pre-Check-In and Post-Check-Out records into the Activity Log? This is safe to run more than once.')) {
      return;
    }
    setIsBackfilling(true);
    let created = 0;
    try {
      const guestsSnap = await getDocs(collection(db, 'guests'));
      for (const docSnap of guestsSnap.docs) {
        const g = docSnap.data() as any;
        const isFailed = g.status === 'In Queue';
        await saveRecord('activity_logs', `backfill_registration_${docSnap.id}`, {
          type: 'registration',
          status: isFailed ? 'failed' : 'success',
          guestName: g.fullName || '',
          bookingId: g.bookingId || g.confirmationCode || docSnap.id,
          complexName: g.complexName || '',
          unitName: g.unitName || '',
          submittedBy: 'Historical Import',
          errorMessage: isFailed ? 'Passport scan incomplete (imported from legacy record).' : '',
          timestamp: g.timestamp || g.updatedAt || new Date().toISOString(),
          backfilled: true
        });
        created++;
      }

      const preSnap = await getDocs(collection(db, 'pre_checkin'));
      const preSeen = new Set<string>();
      for (const docSnap of preSnap.docs) {
        const r = docSnap.data() as any;
        const key = r.bookingId || r.confirmationCode || docSnap.id;
        if (preSeen.has(key)) continue;
        preSeen.add(key);
        await saveRecord('activity_logs', `backfill_pre_checkin_${key}`, {
          type: 'pre_checkin',
          status: 'success',
          guestName: r.guestName || '',
          bookingId: key,
          complexName: r.complexName || '',
          unitName: r.unitName || '',
          submittedBy: 'Historical Import',
          timestamp: r.lastEditedAt || r.timestamp || new Date().toISOString(),
          backfilled: true
        });
        created++;
      }

      const postSnap = await getDocs(collection(db, 'post_checkout'));
      const postSeen = new Set<string>();
      for (const docSnap of postSnap.docs) {
        const r = docSnap.data() as any;
        const key = r.bookingId || r.confirmationCode || docSnap.id;
        if (postSeen.has(key)) continue;
        postSeen.add(key);
        await saveRecord('activity_logs', `backfill_post_checkout_${key}`, {
          type: 'post_checkout',
          status: 'success',
          guestName: r.guestName || '',
          bookingId: key,
          complexName: r.complexName || '',
          unitName: r.unitName || '',
          submittedBy: 'Historical Import',
          timestamp: r.lastEditedAt || r.timestamp || new Date().toISOString(),
          backfilled: true
        });
        created++;
      }

      alert(`Backfill complete — imported ${created} historical record(s) into the Activity Log.`);
    } catch (e) {
      console.error('Backfill failed:', e);
      alert('Backfill failed — check the browser console for details.');
    } finally {
      setIsBackfilling(false);
    }
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleExportXLSX = () => {
    if (filteredEntries.length === 0) {
      alert('No activity log entries to export for this filter.');
      return;
    }
    const exportData = filteredEntries.map((e) => ({
      Type: TYPE_META[e.type]?.label || e.type,
      Status: e.status === 'success' ? 'Success' : 'Failed',
      'Guest Name': e.guestName || '',
      'Booking ID': e.bookingId || '',
      'Villa / Complex': e.complexName || '',
      Unit: e.unitName || '',
      'Submitted By': e.submittedBy || '',
      Timestamp: e.timestamp || '',
      'Error Message': e.errorMessage || ''
    }));
    try {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Report');
      XLSX.writeFile(workbook, `Activity_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error('Export XLSX error:', e);
      alert('Failed to export. Check console.');
    }
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
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
          <ClipboardCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reporting</h1>
          <p className="text-slate-500 mt-1 font-medium">Check-in, check-out and pre/post-inspection activity, successful and failed.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1.5 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            activeTab === 'activity' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Activity Log
        </button>
        <button
          onClick={() => setActiveTab('upsell')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            activeTab === 'upsell' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Upsell Analytics
        </button>
      </div>

      {activeTab === 'activity' && (
      <>
      {/* Date range filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 flex flex-wrap items-center gap-3.5">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-slate-400 uppercase">
          <Calendar className="w-3.5 h-3.5" />
          Period
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                preset === p.key ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700 border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setPreset('custom'); }}
            className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400 text-xs font-bold">—</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => { setCustomTo(e.target.value); setPreset('custom'); }}
            className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleBackfill}
          disabled={isBackfilling}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-60"
          title="Import historical records that existed before Activity Log tracking began"
        >
          <History className={`w-3.5 h-3.5 ${isBackfilling ? 'animate-spin' : ''}`} />
          {isBackfilling ? 'Importing...' : 'Import Historical Data'}
        </button>
        <button
          onClick={handleRefresh}
          className="p-2 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
          title="Refresh"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {CARD_ORDER.map(({ type, title }) => {
          const meta = TYPE_META[type];
          const s = stats[type];
          const successPct = s.total > 0 ? (s.success / s.total) * 100 : 0;
          const failedPct = s.total > 0 ? 100 - successPct : 0;
          return (
            <div key={type} className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="w-9.5 h-9.5 rounded-[10px] flex items-center justify-center" style={{ background: meta.cardIconBg, color: meta.cardIconColor, width: 38, height: 38 }}>
                  {meta.icon}
                </div>
                <span className="text-sm font-bold text-slate-600">{title}</span>
              </div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight mb-2.5">{s.total}</div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-900">{s.success}</span>
                  <span className="text-[11.5px] text-slate-500">Successful</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-sm font-bold text-slate-900">{s.failed}</span>
                  <span className="text-[11.5px] text-slate-500">Failed</span>
                </div>
              </div>
              {s.total > 0 && (
                <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                  <div className="bg-emerald-500" style={{ width: `${successPct}%` }} />
                  <div className="bg-rose-500" style={{ width: `${failedPct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Activity log table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <div className="text-[15px] font-extrabold text-slate-900">Activity Log</div>
            <div className="text-[12.5px] text-slate-500 mt-0.5">Every registration, pre-check-in and post-check-out attempt in the selected period.</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="h-9 pl-8 pr-7 bg-slate-100 border-none rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="registration">Registration</option>
                <option value="pre_checkin">Pre-Check-In</option>
                <option value="post_checkout">Post-Check-Out</option>
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 px-3 bg-slate-100 border-none rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <button
              onClick={handleExportXLSX}
              className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Export filtered log to XLSX"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {isLoading && entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <RefreshCcw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="font-medium">Loading activity log...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <ClipboardList className="w-12 h-12 text-slate-300" />
            <p className="font-medium text-lg">No activity found</p>
            <p className="text-sm">Try widening the date range or clearing the filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white border-b border-slate-200">
                <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-6 py-3.5 font-semibold">Type</th>
                  <th className="px-6 py-3.5 font-semibold">Guest / Booking</th>
                  <th className="px-6 py-3.5 font-semibold">Villa / Unit</th>
                  <th className="px-6 py-3.5 font-semibold">Submitted By</th>
                  <th className="px-6 py-3.5 font-semibold">Date &amp; Time</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {filteredEntries.map((e) => {
                  const meta = TYPE_META[e.type] || TYPE_META.registration;
                  const isSuccess = e.status === 'success';
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors align-top">
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{e.guestName || 'Unknown Guest'}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{e.bookingId || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700 text-[13px]">{e.complexName || '—'}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{e.unitName || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-semibold text-slate-700">{e.submittedBy || '—'}</td>
                      <td className="px-6 py-4 text-[13px] font-semibold text-slate-700">{formatTimestamp(e.timestamp)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                            isSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {isSuccess ? 'Success' : 'Failed'}
                        </span>
                        {!isSuccess && e.errorMessage && (
                          <div className="text-[11.5px] text-rose-500 mt-1.5 max-w-[220px] leading-snug">{e.errorMessage}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'upsell' && <UpsellAnalyticsPanel currentUser={currentUser} />}
    </div>
  );
}
