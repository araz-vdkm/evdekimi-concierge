import React, { useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/auth';
import { useRoles, ALL_SCREENS } from '../lib/roles';
import { RoleDefinition, ScreenAccessLevel, ScreenKey, UserAccount } from '../types';
import { Shield, Plus, Pencil, Trash2, X, Save, Lock, AlertTriangle, RefreshCcw } from 'lucide-react';

interface RoleManagementProps {
  users: UserAccount[];
  accessLevel: ScreenAccessLevel;
}

function slugifyLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (base || 'role') + '_' + Math.random().toString(36).slice(2, 7);
}

const ACCESS_LEVELS: { key: ScreenAccessLevel; label: string }[] = [
  { key: 'none', label: 'No Access' },
  { key: 'view', label: 'View Only' },
  { key: 'full', label: 'Full Access' }
];

type DraftRole = Omit<RoleDefinition, 'key'> & { key: string };

export default function RoleManagement({ users, accessLevel }: RoleManagementProps) {
  const { roles, isLoadingRoles } = useRoles();
  const [editingRole, setEditingRole] = useState<DraftRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleDefinition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const canEdit = accessLevel === 'full';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const roleList = Object.values(roles).sort((a, b) => a.label.localeCompare(b.label));

  const openCreate = () => {
    const blankScreens: Partial<Record<ScreenKey, ScreenAccessLevel>> = {};
    ALL_SCREENS.forEach((s) => { blankScreens[s.key] = 'none'; });
    setEditingRole({ key: '', label: '', screens: blankScreens, exclusiveVillaAssignment: false, isBuiltIn: false });
  };

  const openEdit = (role: RoleDefinition) => {
    const screens: Partial<Record<ScreenKey, ScreenAccessLevel>> = { ...role.screens };
    ALL_SCREENS.forEach((s) => { if (!screens[s.key]) screens[s.key] = 'none'; });
    setEditingRole({ ...role, screens });
  };

  const setScreenLevel = (screen: ScreenKey, level: ScreenAccessLevel) => {
    if (!editingRole) return;
    setEditingRole({ ...editingRole, screens: { ...editingRole.screens, [screen]: level } });
  };

  const saveRole = async () => {
    if (!editingRole) return;
    const label = editingRole.label.trim();
    if (!label) {
      showToast('Give the role a name first.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const key = editingRole.key || slugifyLabel(label);
      const now = new Date().toISOString();
      await setDoc(doc(db, 'roles', key), {
        key,
        label,
        screens: editingRole.screens,
        exclusiveVillaAssignment: !!editingRole.exclusiveVillaAssignment,
        isSuperuser: !!editingRole.isSuperuser,
        isBuiltIn: !!editingRole.isBuiltIn,
        createdAt: editingRole.createdAt || now,
        updatedAt: now
      });
      showToast(editingRole.key ? 'Role updated.' : 'Role created.');
      setEditingRole(null);
    } catch (e: any) {
      showToast(e.message || 'Failed to save role', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteRole = async () => {
    if (!deletingRole) return;
    const inUse = users.some((u) => u.role === deletingRole.key);
    if (inUse) {
      showToast('Can’t delete a role that’s still assigned to a user — move them to another role first.', 'error');
      setDeletingRole(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'roles', deletingRole.key));
      showToast('Role deleted.');
      setDeletingRole(null);
    } catch (e: any) {
      showToast(e.message || 'Failed to delete role', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const usageCount = (roleKey: string) => users.filter((u) => u.role === roleKey).length;

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="w-7 h-7 text-blue-600" />
              Role Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">Create roles and choose which screens each one can see — no access, view only, or full access.</p>
          </div>
          {canEdit && (
            <button
              onClick={openCreate}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" /> New Role
            </button>
          )}
        </div>

        {isLoadingRoles && roleList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 bg-white border border-slate-200 rounded-2xl">
            <RefreshCcw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="font-medium">Loading roles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roleList.map((role) => {
              const grantedScreens = ALL_SCREENS.filter((s) => (role.screens?.[s.key] || 'none') !== 'none');
              return (
                <div key={role.key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-bold text-slate-900 text-[15px] flex items-center gap-2">
                        {role.label}
                        {role.isSuperuser && <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-violet-100 text-violet-700 border border-violet-200">SUPERUSER</span>}
                        {role.isBuiltIn && !role.isSuperuser && <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-500 border border-slate-200">BUILT-IN</span>}
                      </div>
                      <div className="text-[12px] text-slate-400 mt-0.5">
                        {usageCount(role.key)} user{usageCount(role.key) === 1 ? '' : 's'} · {role.exclusiveVillaAssignment ? 'exclusive villa assignment' : 'shared villa assignment'}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(role)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit role">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {role.isBuiltIn ? (
                          <span className="p-1.5 text-slate-300" title="Built-in roles can't be deleted">
                            <Lock className="w-4 h-4" />
                          </span>
                        ) : (
                          <button onClick={() => setDeletingRole(role)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete role">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                    {grantedScreens.length === 0 ? (
                      <span className="text-[11.5px] text-slate-400 italic">No screens granted</span>
                    ) : (
                      grantedScreens.map((s) => {
                        const level = role.screens?.[s.key];
                        return (
                          <span
                            key={s.key}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                              level === 'full' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {s.label} · {level === 'full' ? 'Full' : 'View'}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {editingRole && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  {editingRole.key ? 'Edit Role' : 'New Role'}
                </h2>
                <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">Role name</label>
                  <input
                    type="text"
                    value={editingRole.label}
                    onChange={(e) => setEditingRole({ ...editingRole, label: e.target.value })}
                    placeholder="e.g. Villa Manager"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <label className="flex items-start gap-3 border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingRole.exclusiveVillaAssignment}
                    onChange={(e) => setEditingRole({ ...editingRole, exclusiveVillaAssignment: e.target.checked })}
                    className="mt-0.5 rounded text-blue-600 w-4 h-4"
                  />
                  <span>
                    <span className="block font-bold text-slate-800 text-sm">Exclusive villa assignment</span>
                    <span className="block text-[12.5px] text-slate-500 mt-0.5">A villa assigned to one holder of this role becomes unavailable to every other holder of an exclusive role — use this for roles like Villa Manager where one property has one owner. Leave off for roles that share coverage, like Housekeeping.</span>
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-3">Screen access</label>
                  <div className="flex flex-col gap-2">
                    {ALL_SCREENS.map((screen) => {
                      const level = editingRole.screens?.[screen.key] || 'none';
                      return (
                        <div key={screen.key} className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3">
                          <span className="text-sm font-semibold text-slate-700">{screen.label}</span>
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            {ACCESS_LEVELS.map((opt) => (
                              <button
                                key={opt.key}
                                onClick={() => setScreenLevel(screen.key, opt.key)}
                                className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold transition-colors ${
                                  level === opt.key
                                    ? opt.key === 'full'
                                      ? 'bg-emerald-600 text-white'
                                      : opt.key === 'view'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-slate-500 text-white'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setEditingRole(null)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  onClick={saveRole}
                  disabled={isSaving}
                  className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </div>
          </div>
        )}

        {deletingRole && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Delete "{deletingRole.label}"?</h2>
                <p className="text-sm text-slate-500">This can't be undone. If anyone is still assigned this role, deletion will be blocked until they're moved to another role.</p>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setDeletingRole(null)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteRole}
                  disabled={isDeleting}
                  className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-60"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Role'}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold text-white z-[200] ${toast.type === 'success' ? 'bg-slate-900' : 'bg-rose-600'}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
