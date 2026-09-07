// Historical built-in role keys. UserAccount.role is now a free-form string
// (any role key from the `roles` collection), but these three still exist as
// literal values throughout the app for legacy, role-specific UI quirks that
// predate the custom-roles system (e.g. Supervisor's simplified Minibar-only
// label). New custom roles are just additional string values.
export type UserRole = 'admin' | 'supervisor' | 'frontdesk';

// Every top-level screen that can be shown or hidden per role from the
// Role Management screen. Keep in sync with App.tsx's currentView values.
export type ScreenKey =
  | 'home'
  | 'dashboard'
  | 'usermanagement'
  | 'maintenance'
  | 'minibar'
  | 'upsell'
  | 'reporting'
  | 'qatesting'
  | 'rolemanagement';

export type ScreenAccessLevel = 'none' | 'view' | 'full';

// A role's document in the `roles` Firestore collection. `key` matches
// UserAccount.role. The four built-in roles (admin/supervisor/frontdesk/
// superuser) are seeded automatically on first load so nothing regresses;
// from then on they're editable like any custom role.
export interface RoleDefinition {
  key: string;
  label: string;
  screens: Partial<Record<ScreenKey, ScreenAccessLevel>>;
  // When true, a villa/unit assigned to one holder of this role is removed
  // from the pool available to every other holder of an exclusive role -
  // enforces "one property, one owner" for roles like Villa Manager. Roles
  // that share coverage (e.g. Housekeeping) leave this off.
  exclusiveVillaAssignment?: boolean;
  // The superuser role bypasses every screen check regardless of `screens`
  // (kept in sync with the SUPERUSER_EMAILS allowlist in lib/auth.ts, which
  // stays as a permanent, code-level backstop).
  isSuperuser?: boolean;
  isBuiltIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type MaintenanceSeverity = 'High' | 'Medium' | 'Low';
export type MaintenanceStatus = 'Open' | 'Closed';

export interface MaintenanceTicket {
  id: string;
  createdBy: string;
  createdAt: string;
  villa: string;
  unit: string;
  description: string;
  status: MaintenanceStatus;
  severity?: MaintenanceSeverity;
  bookingId?: string;
  source?: 'pre_checkin' | 'post_checkout' | 'manual';
  photos?: string[];
  
  // Closure resolution details
  closedAt?: string;
  closedBy?: string;
  resolutionDescription?: string;
  resolutionPhotos?: string[];
  updatedAt?: string;
}

export interface UserAccount {
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  company?: string;
  assignedComplexes?: string[];
  assignedUnits?: string[];
  isBlocked?: boolean;
  isApproved?: boolean;
  username: string;
  // Free-form role key referencing a `roles` collection document (see
  // RoleDefinition below) - no longer limited to the historical UserRole
  // union, so custom roles (Villa Manager, Housekeeping, ...) work here too.
  role: string;
  title: string;
}

export interface Guest {
  id: string;
  timestamp: string;
  fullName: string;
  passportNumber: string;
  nationality: string;
  dob: string;
  purpose: string;
  upsell: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  complexName: string;
  unitName: string;
  guestsCount: string;
  bookingId?: string;
  photo?: string;
  contactNumber?: string;
  contactEmail?: string;
  // Upsell Discovery Quiz answers captured at check-in (used by
  // Reporting > Upsell Analytics to correlate guest preferences with
  // the upsells the AI suggested).
  celebrationAnswer?: string;
  interestsAnswer?: string;
  dietaryAnswer?: string;
  nextDestinationAnswer?: string;
}

export interface QuestionnaireAnswers {
  celebration: string;
  interests: string;
  dietary: string;
  nextDestination: string;
}

export interface BookingDetails {
  checkInDate: string;
  checkOutDate: string;
  complexName: string;
  unitName: string;
  guestsCount: string;
  contactNumber?: string;
  contactEmail?: string;
}

export interface MinibarItem {
  name: string;
  quantity: number;
  price: number;
}

export interface MinibarRecord {
  id: string;
  createdAt: string;
  createdBy: string;
  complexName: string;
  unitName: string;
  bookingId?: string;
  items: MinibarItem[];
  totalRevenue: number;
  notes?: string;
}
