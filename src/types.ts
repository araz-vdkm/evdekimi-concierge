export type UserRole = 'admin' | 'supervisor' | 'frontdesk';

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
  role: UserRole;
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
