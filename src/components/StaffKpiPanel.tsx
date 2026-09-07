import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, getAccessToken, getGoogleToken } from '../lib/auth';
import { UserAccount, Guest } from '../types';
import { isReservationAssignedToUser } from '../lib/villaMatcher';
import { normalizeActiveReservations } from '../lib/reservationUtils';
import { useRoles, resolveRole } from '../lib/roles';
import {
  RefreshCcw, ClipboardCheck, ClipboardList, UserCheck,
  AlertTriangle, Info, TrendingUp, Landmark, Target, Percent, Home
} from 'lucide-react';

interface StaffKpiPanelProps {
  currentUser?: UserAccount | null;
  // When set, only the villa-owner card for this uid/username is shown - used
  // to restrict a non-admin viewer (e.g. a Villa Manager granted Reporting
  // access) to their own numbers, never the rest of the portfolio.
  restrictToUid?: string;
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
  status?: string;
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

function parseMoney(v?: string): number {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

interface UpsellItemRecord {
  status?: 'pending' | 'done' | 'rejected';
  price?: string;
  commission?: string;
  handledBy?: string;
}

interface StaffUpsellStat {
  totalRevenue: number;
  totalCommission: number;
  completed: number;
  suggested: number;
  conversionRate: number;
}

interface StaffTypeStat {
  should: number;
  done: number;
  missed: { guestName: string; unitName: string; date: string }[];
}

interface StaffStat {
  user: UserAccount;
  perType: Record<ActivityType, StaffTypeStat>;
  totalShould: number;
  totalDone: number;
}

export default function StaffKpiPanel({ currentUser, restrictToUid }: StaffKpiPanelProps) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingReservations, setIsLoadingReservations] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState<KpiPeriod>('7d');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [upsellItemsMap, setUpsellItemsMap] = useState<Record<string, UpsellItemRecord>>({});
  const { roles } = useRoles();

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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'guests'), (snap) => {
      const list: Guest[] = [];
      snap.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as any), id: docSnap.id });
      });
      setGuests(list);
    }, () => {});
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'upsell_items'), (snap) => {
      const map: Record<string, UpsellItemRecord> = {};
      snap.forEach((docSnap) => {
        map[docSnap.id] = docSnap.data() as UpsellItemRecord;
      });
      setUpsellItemsMap(map);
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

  // Confirmed-only, deduplicated - matches what the Operations Board (Home.tsx)
  // treats as real bookings, so "should" counts here agree with it.
  const activeReservations = useMemo(() => normalizeActiveReservations(reservations), [reservations]);

  // Villa-owner KPI model: whoever holds a role with exclusiveVillaAssignment
  // (in practice, Villa Managers) and has villas assigned is tracked here.
  // The KPI is per-villa - it's the outcome across ALL of their assigned
  // villas, regardless of which staff member (frontdesk, housekeeping, etc.)
  // personally performed each task.
  const allVillaOwnerUsers = useMemo(
    () =>
      users.filter((u) => {
        const roleDef = resolveRole(u.role, roles);
        if (!roleDef?.exclusiveVillaAssignment) return false;
        return (u.assignedComplexes?.length || 0) > 0 || (u.assignedUnits?.length || 0) > 0;
      }),
    [users, roles]
  );

  const villaOwnerUsers = useMemo(
    () => (restrictToUid ? allVillaOwnerUsers.filter((u) => (u.uid || u.username) === restrictToUid) : allVillaOwnerUsers),
    [allVillaOwnerUsers, restrictToUid]
  );

  const staffStats: StaffStat[] = useMemo(() => {
    return villaOwnerUsers.map((user) => {
      const perType = {} as Record<ActivityType, StaffTypeStat>;
      let totalShould = 0;
      let totalDone = 0;

      for (const meta of TYPE_META) {
        const assignedReservations = activeReservations.filter((r) => {
          if (!inRange(r[meta.dateField], start, end)) return false;
          return isReservationAssignedToUser(r, user);
        });

        const missed: StaffTypeStat['missed'] = [];
        let done = 0;

        for (const res of assignedReservations) {
          const bookingId = res.confirmationCode || res.id;
          const matchingLogs = logs.filter(
            (l) => l.type === meta.type && l.status === 'success' && (l.bookingId === bookingId || l.bookingId === res.id)
          );
          if (matchingLogs.length > 0) {
            done++;
          } else {
            missed.push({
              guestName: res.guestName || 'Unknown Guest',
              unitName: res.unitName || res.villa || '—',
              date: res[meta.dateField] || ''
            });
          }
        }

        perType[meta.type] = { should: assignedReservations.length, done, missed };
        totalShould += assignedReservations.length;
        totalDone += done;
      }

      return { user, perType, totalShould, totalDone };
    });
  }, [villaOwnerUsers, activeReservations, logs, start, end]);

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

  // Upsell performance per villa: every suggestion made to a guest staying in
  // one of the owner's villas this period (the "should" side), vs how many
  // were closed out as done by ANYONE - the villa's outcome, not a personal one.
  const upsellStatsByUser = useMemo(() => {
    const result: Record<string, StaffUpsellStat> = {};
    villaOwnerUsers.forEach((user) => {
      const uid = user.uid || user.username || '';
      let totalRevenue = 0;
      let totalCommission = 0;
      let completed = 0;
      let suggested = 0;

      guests
        .filter((g) => {
          if (!isReservationAssignedToUser(g, user)) return false;
          return inRange(g.checkInDate || g.timestamp, start, end);
        })
        .forEach((g) => {
          const items = (g.upsell || '').split(',').map((s) => s.trim()).filter(Boolean);
          items.forEach((_itemText, idx) => {
            suggested++;
            const record = upsellItemsMap[`${g.id}_item_${idx}`];
            if (!record) return;
            if (record.status === 'done') {
              completed++;
              totalRevenue += parseMoney(record.price);
              totalCommission += parseMoney(record.commission);
            }
          });
        });

      result[uid] = {
        totalRevenue,
        totalCommission,
        completed,
        suggested,
        conversionRate: suggested > 0 ? (completed / suggested) * 100 : 0
      };
    });
    return result;
  }, [villaOwnerUsers, guests, upsellItemsMap, start, end]);

  const isLoading = isLoadingUsers || isLoadingReservations;

  const staffName = (u: UserAccount) => u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : (u.username || u.email || 'Unknown');

  const villaNamesFor = (u: UserAccount): string[] => {
    if (u.assignedUnits && u.assignedUnits.length > 0) return u.assignedUnits;
    return u.assignedComplexes || [];
  };

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
          "Should" counts come from the live reservations feed, which only covers bookings from ~7 days ago through ~30 days ahead. Periods are limited to this window on purpose — older bookings aren't retained for comparison. "Done" counts reflect activity logged since this feature was enabled, so any check-ins/check-outs completed earlier won't show here. Each card below is a villa's outcome — it reflects everyone who worked on that villa, not just one person.
        </div>
      </div>

      {isLoading && staffStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white border border-slate-200 rounded-2xl">
          <RefreshCcw className="w-8 h-8 animate-spin text-teal-500" />
          <p className="font-medium">Loading villa KPI...</p>
        </div>
      ) : villaOwnerUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white border border-slate-200 rounded-2xl">
          <AlertTriangle className="w-10 h-10 text-slate-300" />
          <p className="font-medium text-lg">No villas tracked yet</p>
          <p className="text-sm text-center max-w-sm">Assign villas to an account holding an exclusive-villa-assignment role (e.g. Villa Manager) in User Management to start tracking KPI here.</p>
        </div>
      ) : (
        <>
          {/* Overall KPI cards */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-sm font-bold text-slate-600 mb-3.5">Villa Owners Tracked</div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight">{villaOwnerUsers.length}</div>
              <div className="text-[12.5px] text-slate-500 font-medium mt-2.5">accounts with an exclusive villa assignment</div>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-sm font-bold text-slate-600 mb-3.5">Overall Villa Completion</div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight">{overall.pct}%</div>
              <div className="text-[12.5px] text-slate-500 font-medium mt-2.5">{overall.done} of {overall.should} tasks completed across tracked villas</div>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-sm font-bold text-slate-600 mb-3.5">Gaps</div>
              <div className="text-[34px] font-extrabold text-slate-900 tracking-tight">{overall.should - overall.done}</div>
              <div className="text-[12.5px] text-slate-500 font-medium mt-2.5">tasks not yet completed across tracked villas</div>
            </div>
          </div>

          {/* Per-villa breakdown */}
          <div className="flex flex-col gap-4">
            {sortedStats.map((stat) => {
              const pct = stat.totalShould > 0 ? Math.round((stat.totalDone / stat.totalShould) * 100) : 100;
              const barColor = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500';
              const textColor = pct >= 90 ? 'text-emerald-700' : pct >= 70 ? 'text-amber-700' : 'text-rose-700';
              const uid = stat.user.uid || stat.user.username || '';
              const villaNames = villaNamesFor(stat.user);
              const upsell = upsellStatsByUser[uid] || { totalRevenue: 0, totalCommission: 0, completed: 0, suggested: 0, conversionRate: 0 };
              const commissionRate = upsell.totalRevenue > 0 ? (upsell.totalCommission / upsell.totalRevenue) * 100 : null;
              return (
                <div key={uid} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 sm:p-5">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-extrabold text-sm shrink-0">
                        {staffName(stat.user).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-[15px] truncate">{staffName(stat.user)}</div>
                        <div className="flex items-center gap-1.5 text-[12.5px] text-slate-400 mt-1">
                          <Home className="w-3 h-3 shrink-0" />
                          <span className="font-semibold text-slate-500">
                            {villaNames.length} villa{villaNames.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        {villaNames.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {villaNames.map((v) => (
                              <span key={v} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0 justify-between sm:justify-end">
                      {TYPE_META.map((meta) => {
                        const t = stat.perType[meta.type];
                        const tpct = t.should > 0 ? Math.round((t.done / t.should) * 100) : 100;
                        return (
                          <div key={meta.type} className="text-center w-[72px] sm:w-[86px]">
                            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1" title={meta.label}>{meta.icon}</div>
                            <div className="text-sm font-extrabold text-slate-900">{t.done}/{t.should}</div>
                            <div className="text-[11px] text-slate-400 font-medium">{tpct}%</div>
                          </div>
                        );
                      })}
                      <div className="text-right w-16">
                        <div className={`text-lg font-extrabold ${textColor}`}>{pct}%</div>
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100">
                    <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>

                  {/* Villa upsell performance */}
                  <div className="border-t border-slate-100 bg-slate-50/70 px-4 sm:px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-slate-400 uppercase mb-3">
                      Upsells this period
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold uppercase tracking-wide">Total Revenue</span>
                        </div>
                        <div className="text-lg font-extrabold text-slate-900">{formatMoney(upsell.totalRevenue)}</div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">from {upsell.completed} completed upsell{upsell.completed === 1 ? '' : 's'}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Landmark className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold uppercase tracking-wide">Total Commission</span>
                        </div>
                        <div className="text-lg font-extrabold text-slate-900">{formatMoney(upsell.totalCommission)}</div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">{commissionRate !== null ? `${commissionRate.toFixed(1)}% average rate` : 'no completed revenue yet'}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Target className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold uppercase tracking-wide">Completed Upsells</span>
                        </div>
                        <div className="text-lg font-extrabold text-slate-900">{upsell.completed}</div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">of {upsell.suggested} suggested this period</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Percent className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold uppercase tracking-wide">Conversion Rate</span>
                        </div>
                        <div className="text-lg font-extrabold text-slate-900">{upsell.conversionRate.toFixed(0)}%</div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">guests who accepted a suggestion</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
