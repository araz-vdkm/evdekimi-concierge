import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/auth';
import { Guest, UserAccount } from '../types';
import { isReservationAssignedToUser } from '../lib/villaMatcher';
import {
  Calendar,
  RefreshCcw,
  Download,
  TrendingUp,
  Landmark,
  Target,
  Percent,
  Trophy,
  MessageSquareQuote,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface UpsellAnalyticsPanelProps {
  currentUser?: UserAccount | null;
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
  handledBy?: string;
  updatedAt?: string;
}

type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'all' | 'custom';

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' }
];

const PREFERENCE_DIMENSIONS: { key: keyof Guest; label: string }[] = [
  { key: 'celebrationAnswer', label: 'Celebration' },
  { key: 'interestsAnswer', label: 'Interests' },
  { key: 'dietaryAnswer', label: 'Dietary' },
  { key: 'nextDestinationAnswer', label: 'Next destination' }
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateInputValue(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseMoney(v?: string): number {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Reporting > Upsell Analytics.
 * Revenue/commission earned from completed upsells, a top-suggestions
 * leaderboard, and a correlation between the guest's check-in
 * "Upsell Discovery Quiz" answers and what the AI suggested.
 */
export default function UpsellAnalyticsPanel({ currentUser }: UpsellAnalyticsPanelProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, UpsellItemRecord>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [preset, setPreset] = useState<PeriodPreset>('30d');
  const [customFrom, setCustomFrom] = useState<string>(toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [customTo, setCustomTo] = useState<string>(toDateInputValue(new Date()));

  useEffect(() => {
    setIsLoading(true);
    let unsub: any;
    try {
      unsub = onSnapshot(
        collection(db, 'guests'),
        (snap) => {
          const list: Guest[] = [];
          snap.forEach((docSnap) => {
            list.push({ ...(docSnap.data() as any), id: docSnap.id });
          });
          setGuests(list);
          setIsLoading(false);
        },
        (err) => {
          console.warn('Upsell analytics guests snapshot notice:', err);
          setIsLoading(false);
        }
      );
    } catch (e) {
      console.warn('Failed to subscribe to guests for Upsell Analytics:', e);
      setIsLoading(false);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

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
          console.warn('Upsell analytics items snapshot notice:', err);
        }
      );
    } catch (e) {
      console.warn('Failed to subscribe to upsell_items for Upsell Analytics:', e);
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
        start = customFrom ? new Date(customFrom) : null;
        end = customTo ? new Date(new Date(customTo).getTime() + 24 * 60 * 60 * 1000 - 1) : null;
        break;
    }
    return { rangeStart: start, rangeEnd: end };
  }, [preset, customFrom, customTo]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.dispatchEvent(new Event('refresh-data'));
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  const getUpsellItems = (g: Guest): string[] =>
    (g.upsell || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const getItemRecord = (guestId: string, index: number, itemText: string): UpsellItemRecord => {
    const key = `${guestId}_item_${index}`;
    return itemsMap[key] || { guestId, itemIndex: index, itemText, status: 'pending' };
  };

  const guestsInRange = useMemo(() => {
    return guests.filter((g) => {
      if (!isReservationAssignedToUser(g, currentUser)) return false;
      if (!rangeStart && !rangeEnd) return true;
      const ref = g.checkInDate || g.timestamp;
      if (!ref) return false;
      const d = new Date(ref);
      if (isNaN(d.getTime())) return false;
      if (rangeStart && d < rangeStart) return false;
      if (rangeEnd && d > rangeEnd) return false;
      return true;
    });
  }, [guests, currentUser, rangeStart, rangeEnd]);

  const allItems = useMemo(() => {
    const out: { guest: Guest; itemText: string; record: UpsellItemRecord }[] = [];
    guestsInRange.forEach((g) => {
      getUpsellItems(g).forEach((itemText, idx) => {
        out.push({ guest: g, itemText, record: getItemRecord(g.id, idx, itemText) });
      });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestsInRange, itemsMap]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCommission = 0;
    let completed = 0;
    let pending = 0;
    let rejected = 0;
    allItems.forEach(({ record }) => {
      if (record.status === 'done') {
        completed++;
        totalRevenue += parseMoney(record.price);
        totalCommission += parseMoney(record.commission);
      } else if (record.status === 'rejected') {
        rejected++;
      } else {
        pending++;
      }
    });
    const total = allItems.length;
    const conversionRate = total > 0 ? (completed / total) * 100 : 0;
    return { totalRevenue, totalCommission, completed, pending, rejected, total, conversionRate };
  }, [allItems]);

  const leaderboard = useMemo(() => {
    const groups: Record<string, { label: string; suggested: number; completed: number; revenue: number }> = {};
    allItems.forEach(({ itemText, record }) => {
      const key = itemText.trim().toLowerCase();
      if (!key) return;
      if (!groups[key]) groups[key] = { label: itemText.trim(), suggested: 0, completed: 0, revenue: 0 };
      groups[key].suggested++;
      if (record.status === 'done') {
        groups[key].completed++;
        groups[key].revenue += parseMoney(record.price);
      }
    });
    return Object.values(groups)
      .sort((a, b) => b.suggested - a.suggested)
      .slice(0, 8);
  }, [allItems]);

  const preferenceCorrelation = useMemo(() => {
    const rows: { tag: string; guestCount: number; suggestions: { label: string; pct: number }[] }[] = [];

    PREFERENCE_DIMENSIONS.forEach((dim) => {
      const byAnswer: Record<string, { guestIds: Set<string>; upsells: Record<string, { label: string; suggested: number; completed: number }> }> = {};

      guestsInRange.forEach((g) => {
        const answer = (g as any)[dim.key];
        if (!answer || !String(answer).trim()) return;
        const answerKey = String(answer).trim();
        if (!byAnswer[answerKey]) byAnswer[answerKey] = { guestIds: new Set(), upsells: {} };
        byAnswer[answerKey].guestIds.add(g.id);
        getUpsellItems(g).forEach((itemText, idx) => {
          const record = getItemRecord(g.id, idx, itemText);
          const uKey = itemText.trim().toLowerCase();
          if (!uKey) return;
          if (!byAnswer[answerKey].upsells[uKey]) {
            byAnswer[answerKey].upsells[uKey] = { label: itemText.trim(), suggested: 0, completed: 0 };
          }
          byAnswer[answerKey].upsells[uKey].suggested++;
          if (record.status === 'done') byAnswer[answerKey].upsells[uKey].completed++;
        });
      });

      Object.entries(byAnswer).forEach(([answerKey, data]) => {
        if (data.guestIds.size < 2) return;
        const suggestions = Object.values(data.upsells)
          .sort((a, b) => b.suggested - a.suggested)
          .slice(0, 2)
          .map((s) => ({ label: s.label, pct: s.suggested > 0 ? Math.round((s.completed / s.suggested) * 100) : 0 }));
        if (suggestions.length === 0) return;
        rows.push({ tag: `${dim.label}: ${answerKey}`, guestCount: data.guestIds.size, suggestions });
      });
    });

    return rows.sort((a, b) => b.guestCount - a.guestCount).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestsInRange, itemsMap]);

  const completedLog = useMemo(() => {
    return allItems
      .filter(({ record }) => record.status === 'done')
      .sort((a, b) => new Date(b.record.updatedAt || 0).getTime() - new Date(a.record.updatedAt || 0).getTime());
  }, [allItems]);

  const formatTimestamp = (ts?: string) => {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleExportXLSX = () => {
    if (completedLog.length === 0) {
      alert('No completed upsells to export for this filter.');
      return;
    }
    const exportData = completedLog.map(({ guest, itemText, record }) => ({
      Guest: guest.fullName || '',
      'Villa / Complex': guest.complexName || '',
      Unit: guest.unitName || '',
      'Upsell Item': itemText,
      Price: parseMoney(record.price),
      Commission: parseMoney(record.commission),
      'Service Notes': record.serviceNotes || '',
      'Handled By': record.handledBy || '',
      'Completed At': record.updatedAt || ''
    }));
    try {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Completed Upsells');
      XLSX.writeFile(workbook, `Completed_Upsells_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error('Export XLSX error:', e);
      alert('Failed to export. Check console.');
    }
  };

  const doneShare = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const pendingShare = stats.total > 0 ? (stats.pending / stats.total) * 100 : 0;
  const rejectedShare = stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0;

  return (
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
                preset === p.key ? 'bg-violet-50 text-violet-600 border border-violet-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700 border border-transparent'
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
            onChange={(e) => {
              setCustomFrom(e.target.value);
              setPreset('custom');
            }}
            className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <span className="text-slate-400 text-xs font-bold">—</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              setPreset('custom');
            }}
            className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <button
          onClick={handleRefresh}
          className="ml-auto p-2 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
          title="Refresh"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && guests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white border border-slate-200 rounded-2xl">
          <RefreshCcw className="w-8 h-8 animate-spin text-violet-500" />
          <p className="font-medium">Loading upsell analytics...</p>
        </div>
      ) : guestsInRange.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white border border-slate-200 rounded-2xl">
          <Sparkles className="w-12 h-12 text-slate-300" />
          <p className="font-medium text-lg">No guests in this period</p>
          <p className="text-sm">Try widening the date range above.</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="rounded-[10px] flex items-center justify-center bg-violet-50 text-violet-600" style={{ width: 38, height: 38 }}>
                  <TrendingUp className="w-[19px] h-[19px]" />
                </div>
                <span className="text-sm font-bold text-slate-600">Total Revenue</span>
              </div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight mb-2.5">{formatMoney(stats.totalRevenue)}</div>
              <div className="text-[12.5px] text-slate-500 font-medium">from {stats.completed} completed upsell{stats.completed === 1 ? '' : 's'}</div>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="rounded-[10px] flex items-center justify-center bg-emerald-50 text-emerald-600" style={{ width: 38, height: 38 }}>
                  <Landmark className="w-[19px] h-[19px]" />
                </div>
                <span className="text-sm font-bold text-slate-600">Total Commission</span>
              </div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight mb-2.5">{formatMoney(stats.totalCommission)}</div>
              <div className="text-[12.5px] text-slate-500 font-medium">
                {stats.totalRevenue > 0 ? `${((stats.totalCommission / stats.totalRevenue) * 100).toFixed(1)}% average rate` : 'no completed revenue yet'}
              </div>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="rounded-[10px] flex items-center justify-center bg-blue-50 text-blue-600" style={{ width: 38, height: 38 }}>
                  <Target className="w-[19px] h-[19px]" />
                </div>
                <span className="text-sm font-bold text-slate-600">Completed Upsells</span>
              </div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight mb-2.5">{stats.completed}</div>
              <div className="text-[12.5px] text-slate-500 font-medium">of {stats.total} suggested this period</div>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="rounded-[10px] flex items-center justify-center bg-amber-50 text-amber-600" style={{ width: 38, height: 38 }}>
                  <Percent className="w-[19px] h-[19px]" />
                </div>
                <span className="text-sm font-bold text-slate-600">Conversion Rate</span>
              </div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight mb-2.5">{stats.conversionRate.toFixed(0)}%</div>
              <div className="text-[12.5px] text-slate-500 font-medium">guests who accepted a suggestion</div>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2.5">
              <div>
                <div className="text-[15px] font-extrabold text-slate-900">Suggestion Status</div>
                <div className="text-[12.5px] text-slate-500 mt-0.5">{stats.total} AI upsell suggestions in this period</div>
              </div>
              <div className="flex items-center gap-4.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-sm font-bold text-slate-900">{stats.completed}</span>
                  <span className="text-[11.5px] text-slate-500">Done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span className="text-sm font-bold text-slate-900">{stats.pending}</span>
                  <span className="text-[11.5px] text-slate-500">Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span className="text-sm font-bold text-slate-900">{stats.rejected}</span>
                  <span className="text-[11.5px] text-slate-500">Rejected</span>
                </div>
              </div>
            </div>
            {stats.total > 0 && (
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
                <div className="bg-emerald-500" style={{ width: `${doneShare}%` }} />
                <div className="bg-amber-500" style={{ width: `${pendingShare}%` }} />
                <div className="bg-rose-500" style={{ width: `${rejectedShare}%` }} />
              </div>
            )}
          </div>

          {/* Top Suggested Upsells */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-violet-500" />
                <span className="text-[15px] font-extrabold text-slate-900">Top Suggested Upsells</span>
              </div>
              <div className="text-[12.5px] text-slate-500 mt-0.5">Ranked by how often the AI recommends each upsell and how often guests accept it.</div>
            </div>
            {leaderboard.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-sm">No upsell suggestions in this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white border-b border-slate-200">
                    <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="px-6 py-3.5 font-semibold w-14">#</th>
                      <th className="px-6 py-3.5 font-semibold">Suggested Upsell</th>
                      <th className="px-6 py-3.5 font-semibold">Suggested</th>
                      <th className="px-6 py-3.5 font-semibold">Completed</th>
                      <th className="px-6 py-3.5 font-semibold">Acceptance</th>
                      <th className="px-6 py-3.5 font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {leaderboard.map((row, idx) => {
                      const pct = row.suggested > 0 ? Math.round((row.completed / row.suggested) * 100) : 0;
                      const barColor = pct >= 50 ? 'bg-emerald-500' : 'bg-amber-500';
                      const textColor = pct >= 50 ? 'text-emerald-700' : 'text-amber-700';
                      return (
                        <tr key={row.label + idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-extrabold text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{row.label}</td>
                          <td className="px-6 py-4 text-slate-600 font-semibold">{row.suggested}</td>
                          <td className="px-6 py-4 text-slate-600 font-semibold">{row.completed}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-[60px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className={`text-[12.5px] font-bold ${textColor}`}>{pct}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-extrabold text-slate-900">{formatMoney(row.revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Suggested Based on Guest Preferences */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-violet-500" />
                <span className="text-[15px] font-extrabold text-slate-900">Suggested Based on Guest Preferences</span>
              </div>
              <div className="text-[12.5px] text-slate-500 mt-0.5">Which check-in quiz answers most often led the AI to recommend each upsell.</div>
            </div>
            {preferenceCorrelation.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-sm px-6">
                Not enough guest quiz answers captured yet in this period to show a pattern — this fills in as more guests complete the check-in questionnaire.
              </div>
            ) : (
              <div>
                {preferenceCorrelation.map((row, idx) => (
                  <div
                    key={row.tag + idx}
                    className={`flex items-center gap-4 p-4 sm:px-6 flex-wrap sm:flex-nowrap ${idx < preferenceCorrelation.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="shrink-0 min-w-[220px]">
                      <span className="inline-flex items-center text-[11.5px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">{row.tag}</span>
                      <div className="text-[11.5px] text-slate-400 mt-1.5 ml-0.5">{row.guestCount} guest{row.guestCount === 1 ? '' : 's'} answered this</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <div className="flex flex-wrap gap-2">
                      {row.suggestions.map((s, sIdx) => (
                        <span key={sIdx} className="inline-flex items-center text-[11.5px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          {s.label} · {s.pct}%
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Upsells log */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50">
              <div>
                <div className="text-[15px] font-extrabold text-slate-900">Completed Upsells</div>
                <div className="text-[12.5px] text-slate-500 mt-0.5">Every upsell marked Done in the selected period, with price and commission.</div>
              </div>
              <button
                onClick={handleExportXLSX}
                className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                title="Export completed upsells to XLSX"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
            {completedLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <Sparkles className="w-12 h-12 text-slate-300" />
                <p className="font-medium text-lg">No completed upsells yet</p>
                <p className="text-sm">Mark an upsell as Done from the Upsell Opportunities page to see it here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white border-b border-slate-200">
                    <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="px-6 py-3.5 font-semibold">Guest</th>
                      <th className="px-6 py-3.5 font-semibold">Villa / Unit</th>
                      <th className="px-6 py-3.5 font-semibold">Upsell Item</th>
                      <th className="px-6 py-3.5 font-semibold">Price</th>
                      <th className="px-6 py-3.5 font-semibold">Commission</th>
                      <th className="px-6 py-3.5 font-semibold">Handled By</th>
                      <th className="px-6 py-3.5 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {completedLog.map(({ guest, itemText, record }, idx) => (
                      <tr key={`${guest.id}_${idx}`} className="hover:bg-slate-50 transition-colors align-top">
                        <td className="px-6 py-4 font-bold text-slate-900">{guest.fullName || 'Unknown Guest'}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-700 text-[13px]">{guest.complexName || '—'}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{guest.unitName || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">{itemText}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{formatMoney(parseMoney(record.price))}</td>
                        <td className="px-6 py-4 font-bold text-emerald-700">{formatMoney(parseMoney(record.commission))}</td>
                        <td className="px-6 py-4 text-[13px] font-semibold text-slate-700">{record.handledBy || '—'}</td>
                        <td className="px-6 py-4 text-[13px] font-semibold text-slate-700">{formatTimestamp(record.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
