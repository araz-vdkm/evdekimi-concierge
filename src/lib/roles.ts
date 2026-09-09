import { useEffect, useState } from 'react';
import { collection, onSnapshot, setDoc, doc, getDocs } from 'firebase/firestore';
import { db, isSuperUserEmail } from './auth';
import { RoleDefinition, ScreenAccessLevel, ScreenKey, UserAccount } from '../types';

/**
 * Built-in roles, seeded once into the `roles` collection so the app never
 * regresses: their `screens` maps mirror exactly what was hardcoded in
 * App.tsx before the custom-roles system existed. From then on they're
 * ordinary, editable documents like any custom role.
 */
export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    key: 'admin',
    label: 'Admin',
    isBuiltIn: true,
    exclusiveVillaAssignment: false,
    screens: {
      home: 'full',
      dashboard: 'full',
      usermanagement: 'full',
      maintenance: 'full',
      minibar: 'full',
      minibarcatalog: 'full',
      upsell: 'full',
      reporting: 'full',
      qatesting: 'full',
      rolemanagement: 'none'
    }
  },
  {
    key: 'supervisor',
    label: 'Supervisor',
    isBuiltIn: true,
    exclusiveVillaAssignment: false,
    screens: {
      home: 'full',
      dashboard: 'none',
      usermanagement: 'none',
      maintenance: 'none',
      minibar: 'full',
      minibarcatalog: 'none',
      upsell: 'none',
      reporting: 'none',
      qatesting: 'none',
      rolemanagement: 'none'
    }
  },
  {
    key: 'frontdesk',
    label: 'Frontdesk',
    isBuiltIn: true,
    exclusiveVillaAssignment: false,
    screens: {
      home: 'full',
      dashboard: 'none',
      usermanagement: 'none',
      maintenance: 'full',
      minibar: 'full',
      minibarcatalog: 'none',
      upsell: 'full',
      reporting: 'none',
      qatesting: 'none',
      rolemanagement: 'none'
    }
  },
  {
    key: 'superuser',
    label: 'Superuser',
    isBuiltIn: true,
    isSuperuser: true,
    exclusiveVillaAssignment: false,
    screens: {
      home: 'full',
      dashboard: 'full',
      usermanagement: 'full',
      maintenance: 'full',
      minibar: 'full',
      minibarcatalog: 'full',
      upsell: 'full',
      reporting: 'full',
      qatesting: 'full',
      rolemanagement: 'full'
    }
  }
];

export const ALL_SCREENS: { key: ScreenKey; label: string }[] = [
  { key: 'home', label: 'Operations Board' },
  { key: 'dashboard', label: 'Guest Insights' },
  { key: 'usermanagement', label: 'User Management' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'minibar', label: 'Minibar' },
  { key: 'minibarcatalog', label: 'Minibar Catalog' },
  { key: 'upsell', label: 'Upsell Opportunities' },
  { key: 'reporting', label: 'Reporting' },
  { key: 'qatesting', label: 'QA & Roles Suite' },
  { key: 'rolemanagement', label: 'Role Management' }
];

let seedInFlight: Promise<void> | null = null;

/**
 * Idempotent: writes the four default roles only if the `roles` collection
 * is currently empty. Safe to call from multiple clients at once - it
 * writes to fixed doc ids (the role keys), so a race just re-writes the
 * same documents rather than duplicating anything.
 */
export async function seedDefaultRolesIfEmpty(): Promise<void> {
  if (seedInFlight) return seedInFlight;
  seedInFlight = (async () => {
    try {
      const snap = await getDocs(collection(db, 'roles'));
      if (!snap.empty) return;
      const now = new Date().toISOString();
      await Promise.all(
        DEFAULT_ROLES.map((role) =>
          setDoc(doc(db, 'roles', role.key), { ...role, createdAt: now, updatedAt: now })
        )
      );
    } catch (e) {
      console.warn('Failed to seed default roles:', e);
    }
  })();
  return seedInFlight;
}

/** Looks up a role by key, falling back to a built-in default if the roles
 * collection hasn't loaded/seeded yet - so nothing ever renders as fully
 * locked out just because of a load-order race. */
export function resolveRole(roleKey: string | undefined, roles: Record<string, RoleDefinition>): RoleDefinition | undefined {
  if (!roleKey) return undefined;
  return roles[roleKey] || DEFAULT_ROLES.find((r) => r.key === roleKey);
}

export function getScreenAccess(
  user: Pick<UserAccount, 'role' | 'email'> | null | undefined,
  roles: Record<string, RoleDefinition>,
  screen: ScreenKey
): ScreenAccessLevel {
  if (!user) return 'none';
  if (isSuperUserEmail(user.email)) return 'full';
  const role = resolveRole(user.role, roles);
  if (role?.isSuperuser) return 'full';
  return role?.screens?.[screen] || 'none';
}

export function canViewScreen(user: Pick<UserAccount, 'role' | 'email'> | null | undefined, roles: Record<string, RoleDefinition>, screen: ScreenKey): boolean {
  return getScreenAccess(user, roles, screen) !== 'none';
}

export function canEditScreen(user: Pick<UserAccount, 'role' | 'email'> | null | undefined, roles: Record<string, RoleDefinition>, screen: ScreenKey): boolean {
  return getScreenAccess(user, roles, screen) === 'full';
}

export function isSuperuserAccount(user: Pick<UserAccount, 'role' | 'email'> | null | undefined, roles: Record<string, RoleDefinition>): boolean {
  if (!user) return false;
  if (isSuperUserEmail(user.email)) return true;
  const role = resolveRole(user.role, roles);
  return !!role?.isSuperuser;
}

/** Subscribes to the `roles` collection (seeding defaults once if it's
 * empty) and returns a { key -> RoleDefinition } map plus a loading flag. */
export function useRoles(): { roles: Record<string, RoleDefinition>; isLoadingRoles: boolean } {
  const [roles, setRoles] = useState<Record<string, RoleDefinition>>({});
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  useEffect(() => {
    seedDefaultRolesIfEmpty();
    const unsub = onSnapshot(
      collection(db, 'roles'),
      (snap) => {
        const map: Record<string, RoleDefinition> = {};
        snap.forEach((docSnap) => {
          map[docSnap.id] = { ...(docSnap.data() as RoleDefinition), key: docSnap.id };
        });
        setRoles(map);
        setIsLoadingRoles(false);
      },
      (err) => {
        console.warn('Roles snapshot notice:', err);
        setIsLoadingRoles(false);
      }
    );
    return () => unsub();
  }, []);

  return { roles, isLoadingRoles };
}
