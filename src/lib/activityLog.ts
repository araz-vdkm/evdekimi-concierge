import { saveRecord } from './db';

export type ActivityType = 'registration' | 'pre_checkin' | 'post_checkout';
export type ActivityStatus = 'success' | 'failed';

export interface ActivityLogEntry {
  type: ActivityType;
  status: ActivityStatus;
  guestName?: string;
  bookingId?: string;
  complexName?: string;
  unitName?: string;
  submittedBy?: string;
  errorMessage?: string;
}

/**
 * Records a Guest Registration / Pre-Check-In / Post-Check-Out attempt
 * (success or failure) for the Reporting activity log.
 *
 * Best-effort only: this must never throw or block the actual guest-facing
 * flow, since a logging failure is not a reason to fail (or appear to fail)
 * a real check-in/check-out submission.
 */
export const logActivity = async (entry: ActivityLogEntry): Promise<void> => {
  try {
    const id = `${entry.type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await saveRecord('activity_logs', id, {
      ...entry,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Failed to write activity log entry:', e);
  }
};
