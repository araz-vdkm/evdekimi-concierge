/**
 * Shared helpers for turning the raw /api/reservations feed into the same
 * "real, active bookings" set that the Operations Board (Home.tsx) uses -
 * so KPI/reporting counts never diverge from what the front desk actually sees.
 *
 * Home.tsx's processReservations() is the source of truth this mirrors:
 * 1. Drop unconfirmed / canceled / inquiry-only reservations.
 * 2. Deduplicate by confirmationCode (falling back to id) - the raw feed can
 *    contain the same booking more than once.
 */

export function isConfirmedReservation(r: { status?: string }): boolean {
  const st = (r.status || 'confirmed').toLowerCase().trim();
  return st === 'confirmed' || st === 'active' || st === 'booked';
}

export function dedupeReservations<T extends { confirmationCode?: string; id?: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((r) => {
    const code = r.confirmationCode || r.id;
    if (code) {
      if (seen.has(code)) return false;
      seen.add(code);
    }
    return true;
  });
}

/** Confirmed-only, deduplicated reservations - matches Home.tsx's activeReservations. */
export function normalizeActiveReservations<T extends { status?: string; confirmationCode?: string; id?: string }>(
  list: T[]
): T[] {
  return dedupeReservations(list.filter(isConfirmedReservation));
}
