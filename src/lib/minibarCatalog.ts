import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './auth';
import { MinibarCatalogItem } from '../types';

/**
 * The minibar catalog used to be three separately hardcoded copies
 * (PreCheckInFlow.tsx, PostCheckOutFlow.tsx, MinibarDashboard.tsx) that had
 * already drifted out of sync with each other. This is that same list,
 * carried over verbatim as the one-time seed for `minibarCatalog/_default`
 * in Firestore - from here on it's admin-editable, not code.
 */
export const DEFAULT_MINIBAR_CATALOG_ITEMS: MinibarCatalogItem[] = [
  { name: 'Organique Water', location: 'Fridge', price: 35000, parQty: 2 },
  { name: 'Pocari Sweat', location: 'Fridge', price: 25000, parQty: 2 },
  { name: 'Soda Water', location: 'Fridge', price: 25000, parQty: 2 },
  { name: 'Buavita Juice', location: 'Fridge', price: 25000, parQty: 2 },
  { name: 'Coca-Cola', location: 'Fridge', price: 25000, parQty: 2 },
  { name: 'Coca-Cola Zero', location: 'Fridge', price: 25000, parQty: 2 },
  { name: 'UC 1000 Vitamin C', location: 'Fridge', price: 30000, parQty: 2 },
  { name: 'Redbull', location: 'Fridge', price: 50000, parQty: 2 },
  { name: 'Snickers', location: 'Fridge', price: 30000, parQty: 2 },
  { name: 'Oatside Oatmilk', location: 'Fridge', price: 20000, parQty: 2 },
  { name: 'Bintang', location: 'Fridge', price: 50000, parQty: 2 },
  { name: 'Bali Hai', location: 'Fridge', price: 50000, parQty: 2 },
  { name: 'Kura Kura Hazy', location: 'Fridge', price: 90000, parQty: 2 },
  { name: 'Kura Kura Ale', location: 'Fridge', price: 90000, parQty: 2 },
  { name: 'Pringless', location: 'Shelf', price: 35000, parQty: 1 },
  { name: 'Roasted Peanut', location: 'Shelf', price: 25000, parQty: 1 },
  { name: 'Granobar', location: 'Shelf', price: 25000, parQty: 1 },
  { name: 'Oatside Cereal Bar', location: 'Shelf', price: 25000, parQty: 1 },
  { name: 'Roasted Almond', location: 'Shelf', price: 30000, parQty: 1 },
  { name: 'Salted Pistachio', location: 'Shelf', price: 35000, parQty: 1 },
  { name: 'Healthy Protein Bar', location: 'Shelf', price: 70000, parQty: 1 },
  { name: 'Mie Sedap Cup Noodle', location: 'Shelf', price: 35000, parQty: 2 },
];

const CATALOG_COLLECTION = 'minibarCatalog';
const DEFAULT_DOC_ID = '_default';

/**
 * Stable Firestore doc id for a villa's catalog override. Unit names repeat
 * across complexes (e.g. "Appartment 1" exists under several complexes in
 * units.csv), so the key has to include both, not just the unit name.
 */
export function getVillaCatalogKey(complexName?: string | null, unitName?: string | null): string {
  const c = (complexName || '').trim().replace(/\//g, '-');
  const u = (unitName || '').trim().replace(/\//g, '-');
  return `${c}__${u}`;
}

export interface MinibarVillaOverride {
  complexName: string;
  unitName: string;
  items: MinibarCatalogItem[];
}

let seedInFlight: Promise<void> | null = null;

/**
 * Idempotent one-time migration: writes `minibarCatalog/_default` with
 * today's hardcoded item list, but only if that doc doesn't exist yet. Safe
 * to call from multiple clients/tabs at once - it's a single fixed doc id,
 * so a race just re-writes the same content rather than duplicating it.
 */
export async function seedDefaultMinibarCatalogIfEmpty(): Promise<void> {
  if (seedInFlight) return seedInFlight;
  seedInFlight = (async () => {
    try {
      const snap = await getDoc(doc(db, CATALOG_COLLECTION, DEFAULT_DOC_ID));
      if (snap.exists()) return;
      const now = new Date().toISOString();
      await setDoc(doc(db, CATALOG_COLLECTION, DEFAULT_DOC_ID), {
        items: DEFAULT_MINIBAR_CATALOG_ITEMS,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      console.warn('Failed to seed default minibar catalog:', e);
    }
  })();
  return seedInFlight;
}

export interface MinibarCatalogState {
  defaultItems: MinibarCatalogItem[];
  overridesByKey: Record<string, MinibarVillaOverride>;
  isLoadingCatalog: boolean;
}

/**
 * Subscribes to the `minibarCatalog` collection (seeding the default once if
 * it's missing) and returns the default item list plus a { villaKey ->
 * override } map. Live via onSnapshot, same pattern as useRoles(), so a
 * catalog edit made by one admin shows up for everyone else immediately.
 */
export function useMinibarCatalog(): MinibarCatalogState {
  const [defaultItems, setDefaultItems] = useState<MinibarCatalogItem[]>(DEFAULT_MINIBAR_CATALOG_ITEMS);
  const [overridesByKey, setOverridesByKey] = useState<Record<string, MinibarVillaOverride>>({});
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  useEffect(() => {
    seedDefaultMinibarCatalogIfEmpty();
    const unsub = onSnapshot(
      collection(db, CATALOG_COLLECTION),
      (snap) => {
        const overrides: Record<string, MinibarVillaOverride> = {};
        let nextDefaultItems: MinibarCatalogItem[] | null = null;
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const items: MinibarCatalogItem[] = Array.isArray(data.items) ? data.items : [];
          if (docSnap.id === DEFAULT_DOC_ID) {
            if (items.length > 0) nextDefaultItems = items;
          } else {
            overrides[docSnap.id] = {
              complexName: data.complexName || '',
              unitName: data.unitName || '',
              items,
            };
          }
        });
        if (nextDefaultItems) setDefaultItems(nextDefaultItems);
        setOverridesByKey(overrides);
        setIsLoadingCatalog(false);
      },
      (err) => {
        console.warn('Minibar catalog snapshot notice:', err);
        setIsLoadingCatalog(false);
      }
    );
    return () => unsub();
  }, []);

  return { defaultItems, overridesByKey, isLoadingCatalog };
}

/**
 * The list Pre-Check-In / Post-Check-Out / Manual Entry actually use for a
 * given villa: its own override if one has been saved, otherwise the shared
 * default. Falls back to the built-in seed list if the catalog hasn't
 * loaded yet, so nothing ever renders as an empty minibar during that race.
 */
export function getEffectiveMinibarItems(
  complexName: string | undefined | null,
  unitName: string | undefined | null,
  catalog: Pick<MinibarCatalogState, 'defaultItems' | 'overridesByKey'>
): MinibarCatalogItem[] {
  const key = getVillaCatalogKey(complexName, unitName);
  const override = catalog.overridesByKey[key];
  if (override && override.items.length > 0) return override.items;
  return catalog.defaultItems.length > 0 ? catalog.defaultItems : DEFAULT_MINIBAR_CATALOG_ITEMS;
}

export async function saveDefaultMinibarCatalog(items: MinibarCatalogItem[]): Promise<void> {
  await setDoc(
    doc(db, CATALOG_COLLECTION, DEFAULT_DOC_ID),
    { items, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function saveVillaMinibarCatalog(
  complexName: string,
  unitName: string,
  items: MinibarCatalogItem[]
): Promise<void> {
  const key = getVillaCatalogKey(complexName, unitName);
  await setDoc(
    doc(db, CATALOG_COLLECTION, key),
    { complexName, unitName, items, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/** Removes a villa's override so it falls back to the shared default again. */
export async function resetVillaMinibarCatalog(complexName: string, unitName: string): Promise<void> {
  const key = getVillaCatalogKey(complexName, unitName);
  await deleteDoc(doc(db, CATALOG_COLLECTION, key));
}
