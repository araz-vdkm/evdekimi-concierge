import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, getAccessToken, getGoogleToken } from '../lib/auth';
import { UserAccount } from '../types';
import { isReservationAssignedToUser } from '../lib/villaMatcher';
import {
  RefreshCcw, UserCheck, ClipboardCheck, ClipboardList, ChevronDown, ChevronUp,
  AlertTriangle, Info
} from 'lucide-react';

interface StaffKpiPanelProps {
  currentUser?: UserAccount | null;
}

type ActivityType = 'registration' | 'pre_checkin' | 'post_checkout';

interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  status: 'success' | 'failed';
  guestName?: string;
  bookingId?: string;
  complexName?: string;
  unitName?: string;
  submittedBy?: string;
  timestamp?: string;
}

interface Reservation {
  id: string;
  guestName?: string;
  confirmationCode?: string;
  complexName?: string;
  unitName?: string;
  villa?: string;
  checkInDate?: string;
  checkOutDate?: string;
}

type KpiPeriod = 'today' | '7d' | '30d';

const KPI_PERIODS: { key: KpiPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' }
];

const TYPE_META: { type: ActivityType; label: string; icon: React.ReactNode; dateField: 'checkInDate' | 'checkOutDate' }[] = [
  { type: 'registration', label: 'Registration', icon: <UserCheck className="w-3.5 h-3.5" />, dateField: 'checkInDate' },
  { type: 'pre_checkin', label: 'Pre-Check-In', icon: <ClipboardCheck className="w-3.5 h-3.5" />, dateField: 'checkInDate' },
  { type: 'post_checkout', label: 'Post-Check-Out', icon: <ClipboardList className="w-3.5 h-3.5" />, dateField: 'checkOutDate' }
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function rangeForPeriod(period: KpiPeriod): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = startOfToday();
  if (period === '7d') start.setDate(start.getDate() - 6);
  if (period === '30d') start.setDate(start.getDate() - 29);
  return { start, end };
}

function inRange(dateStr: string | undefined, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d >= start && d <= end;
}

interface StaffTypeStat {
  should: number;
  doneByThem: number;
  doneByOther: number;
  missed: { guestName: string; unitName: string; date: string; doneByOther?: string }[];
}

interface StaffStat {
  user: UserAccount;
  perType: Record<ActivityType, StaffTypeStat>;
  totalShould: number;
  totalDone: number;
}

export default function StaffKpiPanel({ currentUser }: StaffKpiPanelProps) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingReservations, setIsLoadingReservations] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState<KpiPeriod>('7d');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<ActivityType | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserAccount[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as UserAccount;
        list.push({ ...data, uid: data.uid || docSnap.id });
      });
      setUsers(list);
      setIsLoadingUsers(false);
    }, () => setIsLoadingUsers(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'activity_logs'), (snap) => {
      const list: ActivityLogEntry[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setLogs(list);
    }, () => {});
    return () => unsub();
  }, []);

  const fetchReservations = async (refresh: boolean = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const token = await getAccessToken().catch(() => 'dummy-token');
      const url = refresh ? `/api/reservations?refresh=true` : `/api/reservations`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'x-google-oauth-token': getGoogleToken() }
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.reservations || data.data || []);
        setReservations(list);
      }
    } catch (e) {
      console.warn('Failed to load reservations for Staff KPI:', e);
    } finally {
      setIsLoadingReservations(false);
      if (refresh) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    const handleRefresh = () => fetchReservations(true);
    window.addEventListener('refresh-data', handleRefresh);
    return () => window.removeEventListener('refresh-data', handleRefresh);
  }, []);

  const handleRefresh = () => {
    fetchReservations(true);
  };

  const { start, end } = useMemo(() => rangeForPeriod(period), [period]);

  const frontdeskUsers = useMemo(
    () => users.filter((u) => u.role === 'frontdesk' && ((u.assignedComplexes?.length || 0) > 0 || (u.assignedUnits?.length || 0) > 0)),
    [users]
  );

  const staffStats: StaffStat[] = useMemo(() => {
    return frontdeskUsers.map((user) => {
      const perType = {} as Record<ActivityType, StaffTypeStat>;
      let totalShould = 0;
      let totalDone = 0;

      for (const meta of TYPE_META) {
        const assignedReservations = reservations.filter((r) => {
          if (!inRange(r[meta.dateField], start, end)) return false;
          return isReservationAssignedToUser(r, user);
        });

        const missed: StaffTypeStat['missed'] = [];
        let doneByThem = 0;
        let doneByOther = 0;

        for (const res of assignedReservations) {
          const bookingId = res.confirmationCode || res.id;
          const matchingLogs = logs.filter(
            (l) => l.type === meta.type && l.status === 'success' && (l.bookingId === bookingId || l.bookingId === res.id)
          );
          const byThem = matchingLogs.find(
            (l) => l.submittedBy && (l.submittedBy === user.username || l.submittedBy === user.email)
          );
          if (byThem) {
            doneByThem++;
          } else if (matchingLogs.length > 0) {
            doneByOther++;
            missed.push({
              guestName: res.guestName || 'Unknown Guest',
              unitName: res.unitName || res.villa || '—',
              date: res[meta.dateField] || '',
              doneByOther: matchingLogs[0].submittedBy
            });
          } else {
            missed.push({
              guestName: res.guestName || 'Unknown Guest',
              unitName: res.unitName || res.villa || '—',
              date: res[meta.dateField] || ''
            });
          }
        }

        perType[meta.type] = { should: assignedReservations.length, doneByThem, doneByOther, missed };
        totalShould += assignedReservations.length;
        totalDone += doneByThem;
      }

      return { user, perType, totalShould, totalDone };
    });
  }, [frontdeskUsers, reservations, logs, start, end]);

  const sortedStats = useMemo(() => {
    return [...staffStats].sort((a, b) => {
      const pctA = a.totalShould > 0 ? a.totalDone / a.totalShould : 1;
      const pctB = b.totalShould > 0 ? b.totalDone / b.totalShould : 1;
      return pctA - pctB;
    });
  }, [staffStats]);

  const overall = useMemo(() => {
    const should = staffStats.reduce((s, st) => s + st.totalShould, 0);
    const done = staffStats.reduce((s, st) => s + st.totalDone, 0);
    return { should, done, pct: should > 0 ? Math.round((done / should) * 100) : 100 };
  }, [staffStats]);

  const isLoading = isLoadingUsers || isLoadingReservations;

  const staffName = (u: UserAccount) => u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : (u.username || u.email || 'Unknown');

  return (
    <>
      {/* Period filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 flex flex-wrap items-center gap-3.5">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-slate-400 uppercase">
          PERIOD
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {KPI_PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                period === p.key ? 'bg-teal-50 text-teal-600 border border-teal-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700 border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          className="ml-auto p-2 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
          title="Refresh"
        >
          <RefreshCcw className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-6 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-[12.5px] text-blue-800 leading-relaxed">
          "Should" counts come from the live reservations feed, which only covers bookings from ~7 days ago through ~30 days ahead. Periods are limited to this window on purpose — older bookings aren't retained for comparison. "Done" counts reflect activity logged since this feature was enabled, so any check-ins/check-outs completed earlier won't show here.
        </div>
      </div>

      {isLoading && staffStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white border border-slate-200 rounded-2xl">
          <RefreshCcw className="w-8 h-8 animate-spin text-teal-500" />
          <p className="font-medium">Loading staff KPI...</p>
        </div>
      ) : frontdeskUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white border border-slate-200 rounded-2xl">
          <AlertTriangle className="w-10 h-10 text-slate-300" />
          <p className="font-medium text-lg">No frontdesk staff with villa assignments yet</p>
          <p className="text-sm text-center max-w-sm">Assign villas to frontdesk accounts in User Management (or use "Import Villa Assignments") to start tracking KPI here.</p>
        </div>
      ) : (
        <>
          {/* Overall KPI cards */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-sm font-bold text-slate-600 mb-3.5">Staff Tracked</div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight">{frontdeskUsers.length}</div>
              <div className="text-[12.5px] text-slate-500 font-medium mt-2.5">frontdesk accounts with villa assignments</div>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-sm font-bold text-slate-600 mb-3.5">Overall Personal Completion</div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight">{overall.pct}%</div>
              <div className="text-[12.5px] text-slate-500 font-medium mt-2.5">{overall.done} of {overall.should} tasks done by the assigned person</div>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-sm font-bold text-slate-600 mb-3.5">Gaps</div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight">{overall.should - overall.done}</div>
              <div className="text-[12.5px] text-slate-500 font-medium mt-2.5">tasks not completed by the assigned staff member</div>
            </div>
          </div>

          {/* Per-staff breakdown */}
          <div className="flex flex-col gap-4">
            {sortedStats.map((stat) => {
              const pct = stat.totalShould > 0 ? Math.round((stat.totalDone / stat.totalShould) * 100) : 100;
              const barColor = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500';
              const textColor = pct >= 90 ? 'text-emerald-700' : pct >= 70 ? 'text-amber-700' : 'text-rose-700';
              const uid = stat.user.uid || stat.user.username || '';
              const isExpanded = expandedUser === uid;
              return (
                <div key={uid} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => { setExpandedUser(isExpanded ? null : uid); setExpandedType(null); }}
                    className="w-full flex items-center gap-4 p-4 sm:p-5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-extrabold text-sm shrink-0">
                      {staffName(stat.user).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-[15px] truncate">{staffName(stat.user)}</div>
                      <div className="text-[12.5px] text-slate-400 mt-0.5">
                        {(stat.user.assignedUnits?.length || 0) + (stat.user.assignedComplexes?.length || 0)} villa{(stat.user.assignedUnits?.length || 0) + (stat.user.assignedComplexes?.length || 0) === 1 ? '' : 's'} assigned
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 shrink-0">
                      {TYPE_META.map((meta) => {
                        const t = stat.perType[meta.type];
                        const tpct = t.should > 0 ? Math.round((t.doneByThem / t.should) * 100) : 100;
                        return (
                          <div key={meta.type} className="text-center w-[86px]">
                            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">{meta.icon}</div>
                            <div className="text-sm font-extrabold text-slate-900">{t.doneByThem}/{t.should}</div>
                            <div className="text-[11px] text-slate-400 font-medium">{tpct}%</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-right shrink-0 w-16">
                      <div className={`text-lg font-extrabold ${textColor}`}>{pct}%</div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  <div className="h-1.5 bg-slate-100">
                    <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {TYPE_META.map((meta) => {
                          const t = stat.perType[meta.type];
                          const active = expandedType === meta.type;
                          return (
                            <button
                              key={meta.type}
                              onClick={() => setExpandedType(active ? null : meta.type)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                                active ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/60 border-transparent text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              {meta.icon} {meta.label}: {t.doneByThem}/{t.should}
                              {t.doneByOther > 0 && <span className="text-slate-400 font-medium">({t.doneByOther} by other staff)</span>}
                            </button>
                          );
                        })}
                      </div>

                      {expandedType && (
                        stat.perType[expandedType].missed.length === 0 ? (
                          <div className="text-[12.5px] text-slate-400 py-2">No gaps for {TYPE_META.find(m => m.type === expandedType)?.label} in this period — nice work.</div>
                        ) : (
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                  <th className="px-4 py-2.5 font-semibold">Guest</th>
                                  <th className="px-4 py-2.5 font-semibold">Villa / Unit</th>
                                  <th className="px-4 py-2.5 font-semibold">Date</th>
                                  <th className="px-4 py-2.5 font-semibold">Status</th>
                                </tr>
                              </thead>
                              <tbody className="text-sm divide-y divide-slate-100">
                                {stat.perType[expandedType].missed.map((m, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-2.5 font-bold text-slate-900">{m.guestName}</td>
                                    <td className="px-4 py-2.5 text-slate-600 font-medium">{m.unitName}</td>
                                    <td className="px-4 py-2.5 text-slate-600 font-medium">{m.date}</td>
                                    <td className="px-4 py-2.5">
                                      {m.doneByOther ? (
                                        <span className="text-[11.5px] font-bold text-amber-700">Done by {m.doneByOther}</span>
                                      ) : (
                                        <span className="text-[11.5px] font-bold text-rose-700">Not done</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
