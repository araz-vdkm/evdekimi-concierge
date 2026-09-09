import React, { useState, useEffect, useMemo, useRef } from 'react';
import { isReservationAssignedToUser } from '../lib/villaMatcher';
import Toast from './Toast';
import { 
  Wrench, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  CheckSquare, 
  Camera, 
  Upload, 
  X, 
  User, 
  Building, 
  Home, 
  Calendar, 
  RefreshCw, 
  Eye, 
  ArrowUpDown, 
  ChevronRight, 
  FileText, 
  Flame, 
  ShieldAlert, 
  CheckCheck, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  Trash2
} from 'lucide-react';
import Webcam from 'react-webcam';
import { MaintenanceTicket, MaintenanceSeverity, MaintenanceStatus, UserAccount } from '../types';
import { db, isSuperUserEmail } from '../lib/auth';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { saveRecord, syncAllRecordsToLocal, deleteRecord, clearFieldsWithAliases } from '../lib/db';
import { compressImage } from '../lib/utils';
import { uploadImageToStorage } from '../lib/storage';
import { useRoles, canEditScreen } from '../lib/roles';

interface MaintenanceDashboardProps {
  currentUser?: UserAccount | null;
  onBackToHome?: () => void;
}

export const formatUserName = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val.username) return val.username;
    if (val.firstName || val.lastName) {
      return `${val.firstName || ''} ${val.lastName || ''}`.trim();
    }
    if (val.email) return val.email;
    if (val.name) return val.name;
    return 'Staff';
  }
  return String(val);
};

export default function MaintenanceDashboard({ currentUser, onBackToHome }: MaintenanceDashboardProps) {
  const { roles } = useRoles();
  const canEdit = canEditScreen(currentUser, roles, 'maintenance');
  const canDelete = canEdit;
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [villaFilter, setVillaFilter] = useState<string>('All');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [closingTicket, setClosingTicket] = useState<MaintenanceTicket | null>(null);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<MaintenanceTicket | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [isConfirmingReopen, setIsConfirmingReopen] = useState<string | null>(null);
  const [isConfirmingDeleteTicket, setIsConfirmingDeleteTicket] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // New ticket form
  const [newVilla, setNewVilla] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState<MaintenanceSeverity>('Medium');
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [activeNewCamera, setActiveNewCamera] = useState(false);

  // Close ticket form
  const [resolutionText, setResolutionText] = useState('');
  const [resolutionPhotos, setResolutionPhotos] = useState<string[]>([]);
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [activeCloseCamera, setActiveCloseCamera] = useState(false);

  const webcamRef = useRef<any>(null);

  // Load all maintenance tickets from Firestore + localStorage + reports
  const fetchTickets = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const ticketsMap = new Map<string, MaintenanceTicket>();

      // 1. Check localStorage for cached maintenance_tickets_*
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('maintenance_tickets_')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const item = JSON.parse(raw);
              if (item && item.id) {
                ticketsMap.set(item.id, {
                  status: 'Open',
                  severity: 'Medium',
                  ...item,
                  createdBy: formatUserName(item.createdBy) || 'Staff',
                  closedBy: item.closedBy ? formatUserName(item.closedBy) : undefined,
                  photos: Array.isArray(item.photos) ? item.photos : [],
                  resolutionPhotos: Array.isArray(item.resolutionPhotos) ? item.resolutionPhotos : []
                });
              }
            }
          } catch (e) {}
        }
      }

      // 2. Also harvest from existing pre_checkin and post_checkout reports
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('pre_checkin_') || key.startsWith('post_checkout_'))) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const rep = JSON.parse(raw);
              if (rep && rep.maintenanceNeeded && rep.maintenanceNotes) {
                const isPre = key.startsWith('pre_checkin_');
                const tId = isPre ? `maint_pre_${rep.bookingId}` : `maint_post_${rep.bookingId}`;
                if (!ticketsMap.has(tId)) {
                  ticketsMap.set(tId, {
                    id: tId,
                    createdBy: formatUserName(rep.submittedBy) || 'Inspector',
                    createdAt: rep.timestamp || new Date().toISOString(),
                    villa: rep.complexName || rep.villa || 'Unknown Villa',
                    unit: rep.unitName || '',
                    description: rep.maintenanceNotes,
                    status: 'Open',
                    severity: 'Medium',
                    bookingId: rep.bookingId,
                    source: isPre ? 'pre_checkin' : 'post_checkout',
                    photos: [],
                    resolutionPhotos: []
                  });
                }
              }
            }
          } catch (e) {}
        }
      }

      // 3. Query Firestore maintenance_tickets collection
      try {
        const snap = await getDocs(collection(db, 'maintenance_tickets'));
        snap.forEach(docSnap => {
          const data = docSnap.data() as MaintenanceTicket;
          const tId = docSnap.id || data.id;
          ticketsMap.set(tId, {
            ...ticketsMap.get(tId),
            ...data,
            id: tId,
            createdBy: formatUserName(data.createdBy) || 'Staff',
            closedBy: data.closedBy ? formatUserName(data.closedBy) : undefined,
            status: data.status || 'Open',
            severity: data.severity || 'Medium',
            photos: Array.isArray(data.photos) ? data.photos : [],
            resolutionPhotos: Array.isArray(data.resolutionPhotos) ? data.resolutionPhotos : []
          });
        });
      } catch (err) {
        console.warn("Firestore tickets query:", err);
      }

      const list = Array.from(ticketsMap.values())
        .sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

      setTickets(list);
    } catch (err) {
      console.error("Failed to load maintenance tickets:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const handleSync = () => fetchTickets(false);
    window.addEventListener('local-storage-synced', handleSync);
    return () => window.removeEventListener('local-storage-synced', handleSync);
  }, []);

  // Update Severity directly
  const handleSeverityChange = async (ticket: MaintenanceTicket, newSev: MaintenanceSeverity) => {
    try {
      const updated: MaintenanceTicket = {
        ...ticket,
        severity: newSev,
        updatedAt: new Date().toISOString()
      };
      
      setTickets(prev => prev.map(t => t.id === ticket.id ? updated : t));
      if (selectedTicketDetail?.id === ticket.id) {
        setSelectedTicketDetail(updated);
      }

      await saveRecord('maintenance_tickets', ticket.id, updated);
    } catch (err) {
      console.error("Failed to update severity:", err);
    }
  };

  // Reopen a closed ticket
    const handleDeleteTicket = async (ticket: MaintenanceTicket) => {
    try {
      if (ticket.source === 'pre_checkin' || ticket.source === 'post_checkout') {
        // This ticket doesn't have its own maintenance_tickets doc — it's
        // synthesized every load from the maintenanceNeeded/maintenanceNotes
        // fields on the underlying pre_checkin/post_checkout report. That
        // report can exist under several alias document ids for the same
        // booking (bookingId, confirmation code, name_<guest>, unit_<unit>_
        // <date>...), so clear those fields on every alias — not just the
        // one named exactly by bookingId — or an un-cleared alias can bring
        // the synthesized ticket back.
        await clearFieldsWithAliases(ticket.source, ticket.bookingId!, {
          maintenanceNeeded: false,
          maintenanceNotes: ''
        });
      } else {
        await deleteRecord('maintenance_tickets', ticket.id);
      }
      setTickets(prev => prev.filter(t => t.id !== ticket.id));
      setIsConfirmingDeleteTicket(null);
      setToast({ message: 'Maintenance ticket deleted successfully.', type: 'success' });
    } catch (err) {
      console.error("Failed to delete ticket:", err);
      alert("Failed to delete maintenance ticket.");
    }
  };

  const handleReopenTicket = async (ticket: MaintenanceTicket) => {
    
    try {
      const updated: MaintenanceTicket = {
        ...ticket,
        status: 'Open',
        updatedAt: new Date().toISOString()
      };

      setTickets(prev => prev.map(t => t.id === ticket.id ? updated : t));
      if (selectedTicketDetail?.id === ticket.id) {
        setSelectedTicketDetail(updated);
      }

      await saveRecord('maintenance_tickets', ticket.id, updated);
    } catch (err) {
      console.error("Failed to reopen ticket:", err);
    }
  };

  // Submit new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVilla.trim() || !newDescription.trim()) {
      alert("Please enter Villa name and defect description.");
      return;
    }

    setIsSubmittingNew(true);
    try {
      const ticketId = `ticket_man_${Date.now()}`;
      const creatorName = currentUser?.username || currentUser?.firstName || currentUser?.email || 'Administrator';
      
      // Upload photos if any
      const uploadedPhotoUrls: string[] = [];
      for (let i = 0; i < newPhotos.length; i++) {
        try {
          const comp = await compressImage(newPhotos[i], 1200, 1200, 0.85);
          const path = `reports/maintenance/${ticketId}/issue_${i}.jpg`;
          const url = await uploadImageToStorage(comp, path);
          uploadedPhotoUrls.push(url);
        } catch (e) {
          uploadedPhotoUrls.push(newPhotos[i]);
        }
      }

      const newTicket: MaintenanceTicket = {
        id: ticketId,
        createdBy: creatorName,
        createdAt: new Date().toISOString(),
        villa: newVilla.trim(),
        unit: newUnit.trim(),
        description: newDescription.trim(),
        status: 'Open',
        severity: newSeverity,
        source: 'manual',
        photos: uploadedPhotoUrls
      };

      await saveRecord('maintenance_tickets', ticketId, newTicket);
      setTickets(prev => [newTicket, ...prev]);

      // Reset form
      setNewVilla('');
      setNewUnit('');
      setNewDescription('');
      setNewSeverity('Medium');
      setNewPhotos([]);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error("Failed to create ticket:", err);
      alert("Error saving maintenance ticket. Please try again.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Submit ticket closure
  const handleCloseTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingTicket) return;
    if (!resolutionText.trim()) {
      alert("Please provide a resolution description to close this ticket.");
      return;
    }

    setIsSubmittingClose(true);
    try {
      const closedByName = currentUser?.username || currentUser?.firstName || currentUser?.email || 'Administrator';
      
      // Upload proof photos if any
      const uploadedProofUrls: string[] = [];
      for (let i = 0; i < resolutionPhotos.length; i++) {
        try {
          const comp = await compressImage(resolutionPhotos[i], 1200, 1200, 0.85);
          const path = `reports/maintenance/${closingTicket.id}/resolution_${i}.jpg`;
          const url = await uploadImageToStorage(comp, path);
          uploadedProofUrls.push(url);
        } catch (e) {
          uploadedProofUrls.push(resolutionPhotos[i]);
        }
      }

      const updated: MaintenanceTicket = {
        ...closingTicket,
        status: 'Closed',
        closedAt: new Date().toISOString(),
        closedBy: closedByName,
        resolutionDescription: resolutionText.trim(),
        resolutionPhotos: uploadedProofUrls,
        updatedAt: new Date().toISOString()
      };

      await saveRecord('maintenance_tickets', closingTicket.id, updated);
      setTickets(prev => prev.map(t => t.id === closingTicket.id ? updated : t));

      if (selectedTicketDetail?.id === closingTicket.id) {
        setSelectedTicketDetail(updated);
      }

      // Reset
      setClosingTicket(null);
      setResolutionText('');
      setResolutionPhotos([]);
    } catch (err) {
      console.error("Failed to close ticket:", err);
      alert("Error closing ticket. Please try again.");
    } finally {
      setIsSubmittingClose(false);
    }
  };

  // Camera capture helper for Create modal
  const captureNewPhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setNewPhotos(prev => [...prev, imageSrc]);
        setActiveNewCamera(false);
      }
    }
  };

  // Camera capture helper for Close modal
  const captureClosePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setResolutionPhotos(prev => [...prev, imageSrc]);
        setActiveCloseCamera(false);
      }
    }
  };

  // Unique villas for filter dropdown
  const uniqueVillas = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => {
      if (t.villa) set.add(t.villa);
    });
    return Array.from(set).sort();
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (!isReservationAssignedToUser(t, currentUser, roles)) return false;
      // Status filter
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      // Severity filter
      if (severityFilter !== 'All' && (t.severity || 'Medium') !== severityFilter) return false;
      // Villa filter
      if (villaFilter !== 'All' && t.villa !== villaFilter) return false;
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches = (
          (t.id && t.id.toLowerCase().includes(term)) ||
          (t.villa && t.villa.toLowerCase().includes(term)) ||
          (t.unit && t.unit.toLowerCase().includes(term)) ||
          (t.description && String(t.description).toLowerCase().includes(term)) ||
          (t.createdBy && formatUserName(t.createdBy).toLowerCase().includes(term)) ||
          (t.closedBy && formatUserName(t.closedBy).toLowerCase().includes(term)) ||
          (t.resolutionDescription && String(t.resolutionDescription).toLowerCase().includes(term))
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, severityFilter, villaFilter, searchTerm]);

  // KPIs
  const kpis = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'Open').length;
    const highOpen = tickets.filter(t => t.status === 'Open' && t.severity === 'High').length;
    const closed = tickets.filter(t => t.status === 'Closed').length;
    return { total, open, highOpen, closed };
  }, [tickets]);

  const getSeverityBadge = (sev?: MaintenanceSeverity) => {
    switch (sev) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-600" /> High
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
      case 'Medium':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" /> Medium
          </span>
        );
    }
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    if (status === 'Closed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Closed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
        <Clock className="w-3.5 h-3.5 text-amber-600" /> Open
      </span>
    );
  };

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen">
      
      {/* Upper Navigation & Title Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Maintenance Dashboard
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
                Manage, assign severity, and resolve logged defect tickets across all units.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => fetchTickets(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {canEdit && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 transition-all hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Log Maintenance Ticket</span>
          </button>
          )}
        </div>
      </div>

      {/* KPI strip: one combined card with dividers, not four separate boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Total Tickets</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{kpis.total}</span>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block">Open Tickets</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">{kpis.open}</span>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">High Severity</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">{kpis.highOpen}</span>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">Resolved / Closed</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{kpis.closed}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by villa, unit, description, staff name, or resolution..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['All', 'Open', 'Closed'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === st 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Severities</option>
            <option value="High">🔴 High Severity</option>
            <option value="Medium">🟡 Medium Severity</option>
            <option value="Low">🔵 Low Severity</option>
          </select>

          {/* Villa Dropdown */}
          {uniqueVillas.length > 0 && (
            <select
              value={villaFilter}
              onChange={e => setVillaFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Villas</option>
              {uniqueVillas.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tickets List View */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Loading maintenance records...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Maintenance Tickets Found</h3>
          <p className="text-xs text-slate-400 max-w-md">
            {searchTerm || statusFilter !== 'All' || severityFilter !== 'All' || villaFilter !== 'All'
              ? 'No tickets match the selected filters. Try clearing search filters.'
              : 'All units are operating smoothly with no active maintenance issues logged!'}
          </p>
          {(searchTerm || statusFilter !== 'All' || severityFilter !== 'All' || villaFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setSeverityFilter('All');
                setVillaFilter('All');
              }}
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map(ticket => {
            const isClosed = ticket.status === 'Closed';

            return (
              <div
                key={ticket.id}
                className={`bg-white rounded-xl border transition-all hover:shadow-md p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                  isClosed ? 'border-slate-200 opacity-90' : 'border-slate-200 border-l-4 border-l-amber-500'
                }`}
              >
                {/* Left block: Villa, Unit, Description, Meta */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(ticket.status)}
                    {getSeverityBadge(ticket.severity)}
                    <span className="text-[11px] font-bold text-slate-400">
                      ID: #{ticket.id.replace('ticket_', '').replace('maint_', '').slice(0, 10)}
                    </span>
                    {ticket.source && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                        {ticket.source === 'pre_checkin' ? 'Pre Check-in' : ticket.source === 'post_checkout' ? 'Post Check-out' : 'Direct Log'}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                      <span>{ticket.villa}</span>
                      {ticket.unit && <span className="text-indigo-600 font-bold">• Unit {ticket.unit}</span>}
                    </h3>
                    <p className="text-sm font-medium text-slate-700 mt-1 leading-relaxed whitespace-pre-line bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {ticket.description}
                    </p>
                  </div>

                  {/* Metadata Row: Created By & Date/Time */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Created by: <strong className="text-slate-700">{formatUserName(ticket.createdBy)}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Date/Time: <span className="font-medium text-slate-700">{formatDateTime(ticket.createdAt)}</span>
                    </span>
                  </div>

                  {/* If closed, show closure snapshot */}
                  {isClosed && (
                    <div className="mt-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-emerald-800">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Resolved & Closed by: {formatUserName(ticket.closedBy) || 'Admin'}
                        </span>
                        <span className="text-emerald-700 font-normal">
                          {formatDateTime(ticket.closedAt)}
                        </span>
                      </div>
                      {ticket.resolutionDescription && (
                        <p className="text-emerald-900 font-medium">
                          <strong>Resolution:</strong> {ticket.resolutionDescription}
                        </p>
                      )}
                      {ticket.resolutionPhotos && ticket.resolutionPhotos.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] font-semibold text-emerald-800">Proof photos:</span>
                          <div className="flex gap-1.5">
                            {ticket.resolutionPhotos.map((p, idx) => (
                              <button
                                key={idx}
                                onClick={() => setPreviewPhotoUrl(p)}
                                className="w-8 h-8 rounded-md overflow-hidden border border-emerald-300 hover:scale-105 transition-transform"
                              >
                                <img src={p} alt="Proof" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right block: Action controls */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-2.5 shrink-0 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  {/* Severity Selector (Admin quick assignment) */}
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Severity:</span>
                    <select
                      value={ticket.severity || 'Medium'}
                      onChange={e => handleSeverityChange(ticket, e.target.value as MaintenanceSeverity)}
                      className="bg-white border border-slate-200 text-xs font-bold rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="High">🔴 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🔵 Low</option>
                    </select>
                  </div>

                  {/* Close / Reopen Actions */}
                  {!isClosed ? (
                    <button
                      onClick={() => {
                        setClosingTicket(ticket);
                        setResolutionText('');
                        setResolutionPhotos([]);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Close Ticket</span>
                    </button>
                  ) : (
                    isConfirmingReopen === ticket.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-600">Reopen?</span>
                        <button onClick={() => { handleReopenTicket(ticket); setIsConfirmingReopen(null); }} className="px-2 py-1 bg-slate-900 text-white rounded text-xs font-bold">Yes</button>
                        <button onClick={() => setIsConfirmingReopen(null)} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsConfirmingReopen(ticket.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Re-open Ticket</span>
                      </button>
                    )
                  )}

                                    {/* View Details modal */}
                  <button
                    onClick={() => setSelectedTicketDetail(ticket)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>
                  
                  {/* Delete button (Admin only) */}
                  {canDelete && (
                    isConfirmingDeleteTicket === ticket.id ? (
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[10px] font-bold text-rose-600">Delete?</span>
                        <button onClick={() => handleDeleteTicket(ticket)} className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-bold">Yes</button>
                        <button onClick={() => setIsConfirmingDeleteTicket(null)} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsConfirmingDeleteTicket(ticket.id)}
                        className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors ml-2"
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. Modal: Log New Maintenance Ticket */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden my-8">
            <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Wrench className="w-5 h-5 text-indigo-200" />
                Log Maintenance Ticket
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-indigo-200 hover:text-white text-base p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Villa / Complex <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newVilla}
                    onChange={e => setNewVilla(e.target.value)}
                    placeholder="e.g. Villa Mandala"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit Name / Room
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    placeholder="e.g. Unit 2B, Master Bedroom"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Severity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['High', 'Medium', 'Low'] as const).map(sev => (
                    <button
                      type="button"
                      key={sev}
                      onClick={() => setNewSeverity(sev)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        newSeverity === sev 
                          ? sev === 'High' 
                            ? 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-300' 
                            : sev === 'Medium' 
                            ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-300'
                            : 'bg-blue-50 border-blue-400 text-blue-800 ring-2 ring-blue-300'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {sev === 'High' ? '🔴 High' : sev === 'Medium' ? '🟡 Medium' : '🔵 Low'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Defect Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Describe the maintenance issue, broken fixture, appliance defect, or required repairs..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Photos attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Attach Defect Photos (Optional)
                </label>
                
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveNewCamera(true)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4 text-indigo-600" /> Take Photo
                  </button>

                  <label className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-4 h-4 text-indigo-600" /> Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async e => {
                        const files = e.target.files;
                        if (!files) return;
                        for (let i = 0; i < files.length; i++) {
                          const reader = new FileReader();
                          reader.onload = ev => {
                            if (ev.target?.result) {
                              setNewPhotos(prev => [...prev, ev.target!.result as string]);
                            }
                          };
                          reader.readAsDataURL(files[i]);
                        }
                      }}
                    />
                  </label>
                </div>

                {newPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {newPhotos.map((p, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={p} alt="Defect" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmittingNew ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{isSubmittingNew ? 'Saving Ticket...' : 'Create Ticket (Open)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Modal: Close / Resolve Maintenance Ticket */}
      {/* ========================================================================= */}
      {closingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden my-8 animate-in fade-in">
            <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                Close Maintenance Ticket
              </div>
              <button 
                onClick={() => setClosingTicket(null)}
                className="text-emerald-200 hover:text-white text-base p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseTicketSubmit} className="p-6 space-y-4">
              {/* Ticket Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">
                    {closingTicket.villa} {closingTicket.unit ? `• Unit ${closingTicket.unit}` : ''}
                  </span>
                  {getSeverityBadge(closingTicket.severity)}
                </div>
                <p className="text-slate-600 font-medium">
                  <strong>Issue:</strong> {closingTicket.description}
                </p>
                <p className="text-slate-400">
                  Logged by {formatUserName(closingTicket.createdBy)} on {formatDateTime(closingTicket.createdAt)}
                </p>
              </div>

              {/* Resolution Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Resolution Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionText}
                  onChange={e => setResolutionText(e.target.value)}
                  placeholder="Describe the completed repairs, replacement parts, or actions taken to resolve this issue..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Attach Proving Photos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Attach Proving Photos (Optional)
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Take or attach photos proving that the repair was completed successfully.
                </p>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveCloseCamera(true)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" /> Take Proof Photo
                  </button>

                  <label className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-4 h-4 text-emerald-600" /> Upload Proof Photo
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async e => {
                        const files = e.target.files;
                        if (!files) return;
                        for (let i = 0; i < files.length; i++) {
                          const reader = new FileReader();
                          reader.onload = ev => {
                            if (ev.target?.result) {
                              setResolutionPhotos(prev => [...prev, ev.target!.result as string]);
                            }
                          };
                          reader.readAsDataURL(files[i]);
                        }
                      }}
                    />
                  </label>
                </div>

                {resolutionPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {resolutionPhotos.map((p, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={p} alt="Proof" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setResolutionPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sign-off User Record */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between text-slate-600">
                <span>Closing Administrator:</span>
                <strong className="text-slate-900">
                  {formatUserName(currentUser) || 'Administrator'}
                </strong>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setClosingTicket(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClose || !resolutionText.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmittingClose ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                  <span>{isSubmittingClose ? 'Closing Ticket...' : 'Confirm Resolution & Close'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Modal: View Ticket Full Details */}
      {/* ========================================================================= */}
      {selectedTicketDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden my-8 animate-in fade-in">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base">
                <Wrench className="w-5 h-5 text-indigo-400" />
                Ticket #{selectedTicketDetail.id.slice(-8)}
              </div>
              <button 
                onClick={() => setSelectedTicketDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    {selectedTicketDetail.villa}
                  </h3>
                  <p className="text-xs font-semibold text-indigo-600">
                    {selectedTicketDetail.unit ? `Unit ${selectedTicketDetail.unit}` : 'Entire Villa'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedTicketDetail.status)}
                  {getSeverityBadge(selectedTicketDetail.severity)}
                </div>
              </div>

              {/* Defect Description */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Defect Description
                </span>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium leading-relaxed">
                  {selectedTicketDetail.description}
                </div>
              </div>

              {/* Issue Photos */}
              {selectedTicketDetail.photos && selectedTicketDetail.photos.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Defect Evidence Photos
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTicketDetail.photos.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPreviewPhotoUrl(p)}
                        className="aspect-square rounded-xl overflow-hidden border border-slate-200 hover:scale-105 transition-transform"
                      >
                        <img src={p} alt="Defect" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Creation metadata */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Logged by</span>
                  <strong className="text-slate-800">{formatUserName(selectedTicketDetail.createdBy)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Created Date/Time</span>
                  <strong className="text-slate-800">{formatDateTime(selectedTicketDetail.createdAt)}</strong>
                </div>
              </div>

              {/* Closure Details if Closed */}
              {selectedTicketDetail.status === 'Closed' && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs uppercase tracking-wider">
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    Resolution Summary
                  </div>

                  <p className="text-xs text-emerald-950 font-medium">
                    {selectedTicketDetail.resolutionDescription || 'No description provided.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60">
                    <div>
                      <span>Closed by: </span>
                      <strong>{formatUserName(selectedTicketDetail.closedBy) || 'Administrator'}</strong>
                    </div>
                    <div>
                      <span>Date/Time: </span>
                      <strong>{formatDateTime(selectedTicketDetail.closedAt)}</strong>
                    </div>
                  </div>

                  {selectedTicketDetail.resolutionPhotos && selectedTicketDetail.resolutionPhotos.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-emerald-800 block mb-1.5">Proof Photos:</span>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedTicketDetail.resolutionPhotos.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPreviewPhotoUrl(p)}
                            className="aspect-square rounded-lg overflow-hidden border border-emerald-300 hover:scale-105 transition-transform"
                          >
                            <img src={p} alt="Resolution" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicketDetail(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. Fullscreen Photo Lightbox */}
      {/* ========================================================================= */}
      {previewPhotoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={previewPhotoUrl} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" 
            />
          </div>
        </div>
      )}

      {/* Camera Capture Overlays */}
      {activeNewCamera && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Take Defect Photo</h3>
              <button onClick={() => setActiveNewCamera(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="relative bg-black aspect-video flex items-center justify-center">
              {/* @ts-ignore */}
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="p-4 bg-slate-50 flex justify-center">
              <button
                type="button"
                onClick={captureNewPhoto}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold shadow-md shadow-indigo-200 transition-colors"
              >
                <Camera className="w-5 h-5" /> Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCloseCamera && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Take Resolution Proof Photo</h3>
              <button onClick={() => setActiveCloseCamera(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="relative bg-black aspect-video flex items-center justify-center">
              {/* @ts-ignore */}
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="p-4 bg-slate-50 flex justify-center">
              <button
                type="button"
                onClick={captureClosePhoto}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold shadow-md shadow-emerald-200 transition-colors"
              >
                <Camera className="w-5 h-5" /> Capture Proof
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
