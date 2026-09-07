import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { saveRecord, deleteRecord, purgeAllOperationalData } from '../lib/db';
import { db, getAccessToken, getGoogleToken, isSuperUserEmail } from '../lib/auth';
import { 
  ShieldCheck, 
  UserX, 
  CheckCircle, 
  Search, 
  Save, 
  AlertTriangle, 
  Building, 
  Trash2, 
  Database, 
  Sparkles, 
  RefreshCw,
  Ban,
  UserCheck,
  Filter,
  UserPlus,
  Activity,
  FileSpreadsheet,
  X,
  ArrowRight,
  Shield,
  Users
} from 'lucide-react';
import { UserAccount, ScreenAccessLevel } from '../types';
import { VILLA_MANAGER_GROUPS } from '../data/villaManagerMapping';
import { useRoles, getScreenAccess, resolveRole } from '../lib/roles';
import RoleManagement from './RoleManagement';

export default function UserManagement({ 
  currentUser,
  onNavigateQA
}: { 
  currentUser?: UserAccount;
  onNavigateQA?: () => void;
}) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked' | 'pending'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const [complexes, setComplexes] = useState<string[]>([]);
  const [unitsByComplex, setUnitsByComplex] = useState<Record<string, string[]>>({});
  
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editAssignedComplexes, setEditAssignedComplexes] = useState<string[]>([]);
  const [editAssignedUnits, setEditAssignedUnits] = useState<string[]>([]);
  const [editRole, setEditRole] = useState<string>('frontdesk');

  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [userToToggleBlock, setUserToToggleBlock] = useState<UserAccount | null>(null);
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);

  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ totalDeleted: number; deletedCounts: Record<string, number> } | null>(null);
  const [purgeStatusMessage, setPurgeStatusMessage] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importSelections, setImportSelections] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const { roles } = useRoles();
  const roleManagementAccess: ScreenAccessLevel = getScreenAccess(currentUser, roles, 'rolemanagement');
  const showRolesTab = roleManagementAccess !== 'none';
  const roleList = Object.values(roles).sort((a, b) => a.label.localeCompare(b.label));

  const isExclusiveRoleKey = (roleKey?: string) => !!resolveRole(roleKey, roles)?.exclusiveVillaAssignment;

  // Finds another user (not excludeUid) who holds `unit` via an exclusive-villa-assignment role,
  // searching the given user list (so callers can check against an in-progress working copy).
  const findUnitHolderIn = (list: UserAccount[], unit: string, excludeUid?: string): UserAccount | undefined => {
    return list.find(u =>
      (u.uid || u.username) !== excludeUid &&
      isExclusiveRoleKey(u.role) &&
      (u.assignedUnits || []).includes(unit)
    );
  };
  const findUnitHolder = (unit: string, excludeUid?: string) => findUnitHolderIn(users, unit, excludeUid);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastNotification({ message, type });
    setTimeout(() => setToastNotification(null), 4500);
  };

  useEffect(() => {
    fetchUsers();
    
    getDocs(collection(db, "villaMappings"))
      .then(querySnapshot => {
        const complexSet = new Set<string>();
        const unitsMap: Record<string, string[]> = {};
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          const c = data.complexType?.trim();
          const u = data.unitName?.trim();
          if (c) {
            complexSet.add(c);
            if (!unitsMap[c]) unitsMap[c] = [];
            if (u && !unitsMap[c].includes(u)) {
              unitsMap[c].push(u);
            }
          }
        });

        const sortedComplexes = Array.from(complexSet).sort();
        for (const c of sortedComplexes) {
          unitsMap[c].sort();
        }

        setComplexes(sortedComplexes);
        setUnitsByComplex(unitsMap);
      })
      .catch(err => {
        console.error("Failed to load complex list from Firebase:", err);
      });
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers: UserAccount[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserAccount;
        fetchedUsers.push({
          ...data,
          uid: data.uid || docSnap.id
        });
      });
      setUsers(fetchedUsers);
    } catch (e) {
      console.warn("Failed to fetch users", e);
    } finally {
      setLoading(false);
    }
  };

  const isSelfUser = (user: UserAccount) => {
    if (!currentUser) return false;
    if (currentUser.uid && user.uid && currentUser.uid === user.uid) return true;
    if (currentUser.email && user.email && currentUser.email.toLowerCase() === user.email.toLowerCase()) return true;
    if (currentUser.username && user.username && currentUser.username === user.username) return true;
    return false;
  };

  const isRootAdmin = (user: UserAccount) => {
    return !!user.email && isSuperUserEmail(user.email);
  };

  const initiateToggleBlock = (user: UserAccount) => {
    if (isSelfUser(user)) {
      showToast("You cannot block your own active administrator account.", "error");
      return;
    }
    const isSuperuser = isSuperUserEmail(currentUser?.email);
    if (!isSuperuser && isRootAdmin(user)) {
      showToast("The system root administrator account cannot be blocked.", "error");
      return;
    }
    setUserToToggleBlock(user);
  };

  const handleApproveUser = async (user: UserAccount) => {
    if (!isSuperUserEmail(currentUser?.email)) {
      showToast("Only the Super User can approve new users.", "error");
      return;
    }
    try {
      const targetId = user.uid || user.username;
      const updatedUser = { ...user, isApproved: true };
      await saveRecord('users', targetId, updatedUser);
      setUsers(users.map(u => u.uid === user.uid ? updatedUser : u));
      showToast(`User ${user.email || user.username} approved successfully.`, "success");
    } catch (e: any) {
      showToast(e.message || 'Failed to approve user', "error");
    }
  };

  const confirmToggleBlock = async () => {
    if (!userToToggleBlock) return;
    setIsTogglingBlock(true);
    try {
      const targetId = userToToggleBlock.uid || userToToggleBlock.username;
      const updatedUser = { ...userToToggleBlock, isBlocked: !userToToggleBlock.isBlocked };
      await saveRecord('users', targetId, updatedUser);
      setUsers(users.map(u => u.uid === userToToggleBlock.uid ? updatedUser : u));
      showToast(`User account ${updatedUser.isBlocked ? 'blocked' : 'unblocked'} successfully.`, "success");
      setUserToToggleBlock(null);
    } catch (e: any) {
      showToast(e.message || 'Failed to update user block status', "error");
    } finally {
      setIsTogglingBlock(false);
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    const isSuperuser = isSuperUserEmail(currentUser?.email);
    
    if (!isSuperuser && isSelfUser(user)) {
      showToast("You cannot delete your own active administrator account.", "error");
      return;
    }
    
    if (!isSuperuser && isRootAdmin(user)) {
      showToast("The system root administrator account cannot be deleted.", "error");
      return;
    }

    setDeletingUser(user);
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const targetId = deletingUser.uid || deletingUser.username;
      await deleteRecord('users', targetId);
      try {
        await deleteDoc(doc(db, 'users', targetId));
      } catch (err) {
        console.warn("Direct firestore delete warning:", err);
      }
      

      
      setUsers(prev => prev.filter(u => u.uid !== deletingUser.uid));
      showToast("User account permanently deleted.", "success");
      setDeletingUser(null);
    } catch (e: any) {
      showToast(e.message || 'Failed to delete user account', "error");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const openEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setEditAssignedComplexes(user.assignedComplexes || []);
    setEditAssignedUnits(user.assignedUnits || []);
    setEditRole(user.role || 'frontdesk');
  };
  
  const saveVillas = async () => {
    if (!editingUser) return;
    const targetIdForCheck = editingUser.uid || editingUser.username;
    if (isExclusiveRoleKey(editRole)) {
      const conflictUnit = editAssignedUnits.find(u => findUnitHolder(u, targetIdForCheck));
      if (conflictUnit) {
        const holder = findUnitHolder(conflictUnit, targetIdForCheck);
        showToast(`"${conflictUnit}" is already assigned to ${holder?.firstName || holder?.username || 'another staff member'} — unassign it from them first.`, "error");
        return;
      }
    }
    try {
      const targetId = editingUser.uid || editingUser.username;
      const updatedUser = { 
        ...editingUser, 
        role: editRole,
        assignedComplexes: editAssignedComplexes,
        assignedUnits: editAssignedUnits
      };
      await saveRecord('users', targetId, updatedUser);
      setUsers(users.map(u => u.uid === editingUser.uid ? updatedUser : u));
      
      // If the currently logged-in user is the one being updated, update local session immediately
      if (
        currentUser && 
        (targetId === currentUser.uid || targetId === currentUser.username || updatedUser.email?.toLowerCase() === currentUser.email?.toLowerCase())
      ) {
        localStorage.setItem('conciergeUser', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('user-updated', { detail: updatedUser }));
      }

      showToast("Assignments updated successfully.", "success");
      setEditingUser(null);
    } catch(e: any) {
      showToast(e.message || 'Failed to save assignments', "error");
    }
  };

  const applyVillaImport = async () => {
    const entries = (Object.entries(importSelections) as [string, string][]).filter(([, targetId]) => targetId);
    if (entries.length === 0) {
      showToast("Pick at least one staff member to match before applying.", "error");
      return;
    }
    setIsImporting(true);
    try {
      let updatedCount = 0;
      const skippedConflicts: string[] = [];
      const nextUsers = [...users];
      for (const [managerName, targetId] of entries) {
        const group = VILLA_MANAGER_GROUPS.find(g => g.villaManager === managerName);
        if (!group) continue;
        const idx = nextUsers.findIndex(u => (u.uid || u.username) === targetId);
        if (idx === -1) continue;
        const targetUser = nextUsers[idx];
        const targetIsExclusive = isExclusiveRoleKey(targetUser.role);
        const existingUnits = targetUser.assignedUnits || [];
        let unitsToAdd = group.units.filter(u => !existingUnits.includes(u));
        if (targetIsExclusive) {
          const blocked = unitsToAdd.filter(u => findUnitHolderIn(nextUsers, u, targetId));
          if (blocked.length > 0) {
            skippedConflicts.push(`${managerName}: ${blocked.join(', ')}`);
          }
          unitsToAdd = unitsToAdd.filter(u => !findUnitHolderIn(nextUsers, u, targetId));
        }
        const mergedUnits = Array.from(new Set([...existingUnits, ...unitsToAdd]));
        const updatedUser: UserAccount = { ...targetUser, assignedUnits: mergedUnits };
        await saveRecord('users', targetId, updatedUser);
        nextUsers[idx] = updatedUser;
        updatedCount++;

        if (
          currentUser &&
          (targetId === currentUser.uid || targetId === currentUser.username || updatedUser.email?.toLowerCase() === currentUser.email?.toLowerCase())
        ) {
          localStorage.setItem('conciergeUser', JSON.stringify(updatedUser));
          window.dispatchEvent(new CustomEvent('user-updated', { detail: updatedUser }));
        }
      }
      setUsers(nextUsers);
      if (skippedConflicts.length > 0) {
        showToast(`Applied, but some villas were skipped (already exclusively assigned to someone else): ${skippedConflicts.join(' | ')}`, "error");
      } else {
        showToast(`Applied villa assignments to ${updatedCount} staff member${updatedCount === 1 ? '' : 's'}.`, "success");
      }
      setShowImportModal(false);
      setImportSelections({});
    } catch (e: any) {
      showToast(e.message || 'Failed to apply villa assignments', "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleComplexToggle = (complex: string) => {
    const editingIsExclusive = isExclusiveRoleKey(editRole);
    const excludeUid = editingUser?.uid || editingUser?.username;
    setEditAssignedComplexes(prev => {
      const isSelected = prev.includes(complex);
      const newComplexes = isSelected ? prev.filter(c => c !== complex) : [...prev, complex];
      
      const unitsForComplex = unitsByComplex[complex] || [];
      if (!isSelected) {
        setEditAssignedUnits(prevUnits => {
          const toAdd = unitsForComplex.filter(u => {
            if (prevUnits.includes(u)) return false;
            if (editingIsExclusive && findUnitHolder(u, excludeUid)) return false;
            return true;
          });
          return [...prevUnits, ...toAdd];
        });
      } else {
        setEditAssignedUnits(prevUnits => prevUnits.filter(u => !unitsForComplex.includes(u)));
      }
      
      return newComplexes;
    });
  };

  const handleUnitToggle = (unit: string) => {
    setEditAssignedUnits(prev => 
      prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
    );
  };

  const handlePurgeDataClick = () => {
    if (!isSuperUserEmail(currentUser?.email)) {
      showToast("Only super user roman@evdekimi.com is authorized to purge test data.", "error");
      return;
    }
    setShowPurgeModal(true);
  };

  const executePurge = async () => {
    if (!isSuperUserEmail(currentUser?.email)) {
      showToast("Only super user roman@evdekimi.com is authorized to purge test data.", "error");
      return;
    }
    setShowPurgeModal(false);
    setIsPurging(true);
    setPurgeStatusMessage("Purging operational test data from Firestore and resetting local caches...");
    setPurgeResult(null);

    try {
      const result = await purgeAllOperationalData();
      setPurgeResult(result);
      setPurgeStatusMessage(`✅ All operational test data has been successfully cleaned up! (${result.totalDeleted} items removed). System is ready for pre-commercial testing.`);
      showToast("All operational test data purged successfully!", "success");
    } catch (err: any) {
      const msg = `❌ Error during cleanup: ${err.message || err}`;
      setPurgeStatusMessage(msg);
      showToast(msg, "error");
    } finally {
      setIsPurging(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (u.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.company || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'blocked' ? u.isBlocked === true :
      statusFilter === 'pending' ? (u.isApproved === false || (u.isApproved === undefined && !isSuperUserEmail(u.email))) :
      (u.isBlocked !== true && (u.isApproved === true || isSuperUserEmail(u.email)));

    const matchesRole = 
      roleFilter === 'all' ? true :
      u.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const totalActive = users.filter(u => u.isBlocked !== true && u.isApproved !== false).length;
  const totalBlocked = users.filter(u => u.isBlocked === true).length;
  const totalPending = users.filter(u => u.isApproved === false).length;

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
              User Management & Access Control
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manage staff accounts, assign villas, block unauthorized access, or delete user records.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {onNavigateQA && (
              <button
                onClick={onNavigateQA}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>QA & Role Testing Suite</span>
              </button>
            )}
            {isSuperUserEmail(currentUser?.email) && (
              <button
                onClick={() => { setImportSelections({}); setShowImportModal(true); }}
                className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                <span>Import Villa Assignments</span>
              </button>
            )}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">
              <span className="px-2 py-1 rounded bg-white shadow-xs text-slate-900 font-bold">Total: {users.length}</span>
              <span className="px-2 py-1 text-emerald-700">Active: {totalActive}</span>
              {totalBlocked > 0 && <span className="px-2 py-1 text-rose-700 font-bold">Blocked: {totalBlocked}</span>}
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        {showRolesTab && (
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" /> Users
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'roles' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-4 h-4" /> Roles
            </button>
          </div>
        )}

        {activeTab === 'users' && (
        <>
        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, username, or company..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses ({users.length})</option>
              <option value="active">Active Only ({totalActive})</option>
              <option value="pending">Waiting for Approval ({totalPending})</option>
              <option value="blocked">Blocked Only ({totalBlocked})</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              {roleList.map(r => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pre-Commercial Testing System Reset & Purge Panel - Superuser Only */}
        {isSuperUserEmail(currentUser?.email) && (
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Pre-Commercial Testing Readiness
                </div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" /> System Test Data Cleanup & Reset
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Purge previous test guest registrations, pre-check-in / post-checkout reports, guest feedback surveys, and maintenance defect tickets from Firebase and local device caches. User accounts, staff permissions, and sheet templates remain completely safe.
                </p>
              </div>
              <button
                onClick={handlePurgeDataClick}
                disabled={isPurging}
                className={`shrink-0 px-5 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all ${
                  isPurging
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 active:scale-95 text-white'
                }`}
              >
                {isPurging ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Purging Test Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Purge All Test Data & Reset</span>
                  </>
                )}
              </button>
            </div>

            {purgeStatusMessage && (
              <div className="mt-4 p-4 bg-slate-800/80 border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-200">
                <p className="font-semibold">{purgeStatusMessage}</p>
                {purgeResult && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-700">Pre-Check-In: <strong>{purgeResult.deletedCounts['pre_checkin'] || 0}</strong></div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-700">Post-Check-Out: <strong>{purgeResult.deletedCounts['post_checkout'] || 0}</strong></div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-700">Guest Registrations: <strong>{purgeResult.deletedCounts['guest_reg'] || 0}</strong></div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-700">Guest Profiles: <strong>{purgeResult.deletedCounts['guests'] || 0}</strong></div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-700">Surveys: <strong>{purgeResult.deletedCounts['survey'] || 0}</strong></div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-700">Maintenance Tickets: <strong>{purgeResult.deletedCounts['maintenance_tickets'] || 0}</strong></div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-700">Minibar Records: <strong>{purgeResult.deletedCounts['minibar'] || 0}</strong></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4 font-semibold">User Details</th>
                    <th className="px-6 py-4 font-semibold">Role & Company</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Assigned Villas</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isSelf = isSelfUser(user);
                    const isRoot = isRootAdmin(user);
                    const isSuperuser = isSuperUserEmail(currentUser?.email);
                    const isProtected = !isSuperuser && (isSelf || isRoot);

                    return (
                      <tr 
                        key={user.uid || user.username} 
                        className={`hover:bg-slate-50/80 transition-colors ${user.isBlocked ? 'bg-rose-50/40' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-900">
                              {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.username}
                            </div>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                YOU
                              </span>
                            )}
                            {isRoot && !isSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                ROOT
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-xs">{user.email || user.username}</div>
                          {user.mobile && <div className="text-slate-400 text-xs mt-0.5">{user.mobile}</div>}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                              user.role === 'supervisor' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}>
                              {user.role === 'supervisor' ? 'Supervisor (Minibar Entry Only)' : user.role}
                            </span>
                          </div>
                          <div className="text-slate-600 font-medium text-xs">{user.company || 'ConciergePro Staff'}</div>
                        </td>

                        <td className="px-6 py-4">
                          {user.isApproved === false ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                              Waiting Approval
                            </span>
                          ) : user.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3 text-rose-600" /> Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {(isSuperUserEmail(currentUser?.email) || user.role === 'supervisor' || user.role === 'frontdesk') ? (
                            <div>
                              <div className="text-xs text-slate-600 mb-1">
                                <strong>{user.assignedComplexes?.length || 0}</strong> complexes, <strong>{user.assignedUnits?.length || 0}</strong> units
                              </div>
                              <button 
                                onClick={() => openEditModal(user)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Building className="w-3.5 h-3.5" /> Edit Assignments / Role
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Full Access (Admin)</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.isApproved === false && isSuperUserEmail(currentUser?.email) && (
                              <button
                                onClick={() => handleApproveUser(user)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-300"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Approve
                              </button>
                            )}

                            {/* Block / Unblock Button */}
                            <button
                              onClick={() => initiateToggleBlock(user)}
                              disabled={isProtected}
                              title={isProtected ? 'Protected account' : (user.isBlocked ? 'Unblock user access' : 'Block user from signing in')}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                                isProtected
                                  ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                                  : user.isBlocked 
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300' 
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300'
                              }`}
                            >
                              {user.isBlocked ? (
                                <><UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Unblock</>
                              ) : (
                                <><Ban className="w-3.5 h-3.5 text-amber-600" /> Block</>
                              )}
                            </button>

                            {/* Delete User Button */}
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={isProtected}
                              title={isProtected ? 'Protected account' : 'Permanently delete user'}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                                isProtected
                                  ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 active:scale-95'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                        No users found matching the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {activeTab === 'roles' && showRolesTab && (
        <RoleManagement users={users} accessLevel={roleManagementAccess === 'full' ? 'full' : 'view'} />
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-full text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete User Account</h3>
                <p className="text-xs text-rose-600">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-600">
                Are you sure you want to permanently delete the account for:
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">
                  {deletingUser.firstName ? `${deletingUser.firstName} ${deletingUser.lastName || ''}` : deletingUser.username}
                </div>
                <div className="text-xs text-slate-500">{deletingUser.email || deletingUser.username}</div>
                <div className="text-xs text-slate-500 mt-1 capitalize">Role: <strong>{deletingUser.role}</strong></div>
              </div>
              <p className="text-xs text-slate-500">
                Their login credentials, profile data, and villa assignments will be permanently removed from Firebase Firestore.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 text-xs disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignments / Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Edit Assignments - {editingUser.firstName} {editingUser.lastName}
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {isSuperUserEmail(currentUser?.email) && (
                <div className="border border-slate-200 rounded-lg p-4 bg-white">
                  <label className="block text-sm font-bold text-slate-800 mb-2">User Role</label>
                  <select 
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roleList.map(r => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                  {isExclusiveRoleKey(editRole) && (
                    <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 mt-2">
                      This role requires exclusive villa assignment: each villa can belong to only one person holding such a role at a time. Villas already held by someone else are locked below — unassign them there first.
                    </p>
                  )}
                </div>
              )}

              {complexes.map(c => (
                <div key={c} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <label className="flex items-center gap-2 font-bold text-slate-800 mb-3 cursor-pointer">
                    <input type="checkbox" checked={editAssignedComplexes.includes(c)} onChange={() => handleComplexToggle(c)} className="rounded text-blue-600 w-5 h-5" />
                    {c}
                  </label>
                  <div className="pl-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {unitsByComplex[c]?.map(u => {
                      const holder = isExclusiveRoleKey(editRole) ? findUnitHolder(u, editingUser?.uid || editingUser?.username) : undefined;
                      return (
                        <label key={u} className={`flex items-center gap-2 text-sm cursor-pointer font-medium transition-colors ${holder ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900'}`}>
                          <input type="checkbox" checked={editAssignedUnits.includes(u)} disabled={!!holder} onChange={() => handleUnitToggle(u)} className="rounded text-blue-600 w-4 h-4 disabled:opacity-40" />
                          <span>{u}</span>
                          {holder && (
                            <span className="text-[10px] text-amber-700 font-semibold">(held by {holder.firstName || holder.username})</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveVillas}
                className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block / Unblock Confirmation Modal */}
      {userToToggleBlock && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${userToToggleBlock.isBlocked ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className={`p-2 rounded-full ${userToToggleBlock.isBlocked ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {userToToggleBlock.isBlocked ? <UserCheck className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {userToToggleBlock.isBlocked ? 'Unblock User Account' : 'Block User Account'}
                </h3>
                <p className="text-xs text-slate-500">
                  {userToToggleBlock.isBlocked ? 'Restore user login and system access' : 'Temporarily suspend login access'}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-600">
                Are you sure you want to {userToToggleBlock.isBlocked ? 'unblock' : 'block'} access for:
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">
                  {userToToggleBlock.firstName ? `${userToToggleBlock.firstName} ${userToToggleBlock.lastName || ''}` : userToToggleBlock.username}
                </div>
                <div className="text-xs text-slate-500">{userToToggleBlock.email || userToToggleBlock.username}</div>
                <div className="text-xs text-slate-500 mt-1 capitalize">Role: <strong>{userToToggleBlock.role}</strong></div>
              </div>
              <p className="text-xs text-slate-500">
                {userToToggleBlock.isBlocked
                  ? 'The user will immediately be able to sign in again to their account.'
                  : 'The user will be immediately rejected upon attempting to log in, and their active session will be revoked.'}
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setUserToToggleBlock(null)}
                disabled={isTogglingBlock}
                className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleBlock}
                disabled={isTogglingBlock}
                className={`px-4 py-2 font-bold text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 text-xs disabled:opacity-50 ${
                  userToToggleBlock.isBlocked
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isTogglingBlock ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : userToToggleBlock.isBlocked ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Confirm Unblock</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Confirm Block</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Villa Assignments Modal - Superuser Only */}
      {showImportModal && isSuperUserEmail(currentUser?.email) && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                Import Villa Assignments
              </h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 text-[12.5px] text-blue-800 leading-relaxed">
                This matches the villa manager list from the uploaded spreadsheet to real ConciergePro accounts. For each name below, pick the matching staff account (or leave unmatched to skip). Applying will add that spreadsheet's villas to the selected account's assigned units, merging with whatever is already assigned.
              </div>

              {VILLA_MANAGER_GROUPS.map((group) => {
                const knownUnits = new Set(Object.values(unitsByComplex).flat());
                const matchedUnits = group.units.filter(u => knownUnits.has(u));
                const unmatchedUnits = group.units.filter(u => !knownUnits.has(u));
                const selectedTargetId = importSelections[group.villaManager];
                const selectedTarget = selectedTargetId ? users.find(u => (u.uid || u.username) === selectedTargetId) : undefined;
                const targetIsExclusive = selectedTarget ? isExclusiveRoleKey(selectedTarget.role) : false;
                return (
                  <div key={group.villaManager} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{group.villaManager}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{group.email || 'no email in spreadsheet'} &middot; {group.units.length} villa{group.units.length === 1 ? '' : 's'}</div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-72 shrink-0">
                        <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                        <select
                          value={importSelections[group.villaManager] || ''}
                          onChange={(e) => setImportSelections(prev => ({ ...prev, [group.villaManager]: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="">-- Not matched / skip --</option>
                          {users.slice().sort((a, b) => (a.firstName || a.username || '').localeCompare(b.firstName || b.username || '')).map(u => (
                            <option key={u.uid || u.username} value={u.uid || u.username}>
                              {(u.firstName || u.lastName) ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : (u.username || u.email)} ({u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {matchedUnits.map(u => {
                        const holder = targetIsExclusive ? findUnitHolder(u, selectedTargetId) : undefined;
                        return (
                          <span
                            key={u}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${holder ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
                            title={holder ? `Already assigned to ${holder.firstName || holder.username || 'another staff member'} (exclusive role) — unassign it there first, or it will be skipped on apply.` : undefined}
                          >
                            {u}{holder ? ' (held elsewhere)' : ''}
                          </span>
                        );
                      })}
                      {unmatchedUnits.map(u => (
                        <span key={u} className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[11px] font-semibold" title="Not found among the system's known units/complexes">{u} (unrecognized)</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                onClick={applyVillaImport}
                disabled={isImporting}
                className="px-4 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" /> {isImporting ? 'Applying...' : 'Apply Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge All Test Data Confirmation Modal - Superuser Only */}
      {showPurgeModal && isSuperUserEmail(currentUser?.email) && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-4 z-[120] backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-full text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Pre-Commercial Testing Cleanup</h3>
                <p className="text-xs text-rose-600 font-semibold">Purge Test Operational Data & Reset Cache</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                Are you sure you want to clean up all test operational records? This action cleans the environment so you can begin fresh testing.
              </p>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Items that will be deleted:</div>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>All Guest Registrations & Passports (`guest_reg`)</li>
                  <li>Guest Master Profile Database (`guests`)</li>
                  <li>Pre-Check In Inspection Reports (`pre_checkin`)</li>
                  <li>Post-Check Out Inspection Reports (`post_checkout`)</li>
                  <li>Guest Feedback Surveys (`survey`)</li>
                  <li>Maintenance Defect Tickets (`maintenance_tickets`)</li>
                  <li>All Device Offline Drafts & Cached States</li>
                </ul>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Protected:</strong> User accounts, staff permissions, and sheet templates are preserved.</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowPurgeModal(false)}
                disabled={isPurging}
                className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                onClick={executePurge}
                disabled={isPurging}
                className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 text-xs disabled:opacity-50 active:scale-95"
              >
                {isPurging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging Test Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Purge Test Data & Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-[130] animate-in slide-in-from-bottom-5 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-semibold ${
            toastNotification.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : toastNotification.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}>
            {toastNotification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toastNotification.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastNotification.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />}
            <span>{toastNotification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
