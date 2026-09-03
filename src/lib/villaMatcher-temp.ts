/**
 * Villa and Complex Matcher Utility
 * Accurately normalizes and matches property and unit names between PMS (Hospara),
 * Google Sheets, and User Access Control (assignedComplexes / assignedUnits).
 */

import { getDocs, collection } from "firebase/firestore";
import { db } from "./auth"; // Assuming db is exported from auth or db.ts

export interface PropertyMatch {
  complexName: string;
  unitName: string;
  displayName: string;
  code?: string;
}

export interface DynamicMapping {
  guestyNickname: string;
  complexType: string;
  unitName: string;
}

// Fallback canonical sheet mappings (used if DB fetch fails or hasn't completed)
export let KNOWN_PROPERTY_MAPPINGS: { pattern: RegExp; complex: string; unitPrefix?: string; unit?: string }[] = [
  // Dragon Stone Villas
  { pattern: /DGS[-_ ]*V0*(\d+)/i, complex: "Dragon Stone Villas", unitPrefix: "DragonStone V" },
  // Dragon Stone Suites / Apartments
  { pattern: /DGS[-_ ]*A0*(\d+)/i, complex: "Dragon Stone Suites", unitPrefix: "DragonStone A" },
  
  // Sacred Jungle Villas (Phase 1 & 2)
  { pattern: /SCJ[-_ ]*0*([1-3])V/i, complex: "Sacred Jungle Villas", unitPrefix: "SJ 1 Villa " },
  { pattern: /SCJ[-_ ]*0*([4-6])V/i, complex: "Sacred Jungle Villas 2", unitPrefix: "SJ 2 Villa " },
  
  // Sacred Jungle Suites / Apartments
  { pattern: /SCJ[-_ ]*0*1A/i, complex: "Sacred Jungle Suites", unit: "SJ Apart 1 (Mezanine)" },
  { pattern: /SCJ[-_ ]*0*2A/i, complex: "Sacred Jungle Suites", unit: "SJ Apart 2 (Mezanine)" },
  { pattern: /SCJ[-_ ]*0*3A/i, complex: "Sacred Jungle Suites", unit: "SJ Apart 3 (Mezanine)" },
  { pattern: /SCJ[-_ ]*0*9A/i, complex: "Sacred Jungle Suites", unit: "SJ Apart 9 (2BDr)" },
  { pattern: /SCJ[-_ ]*0*(\d+)A/i, complex: "Sacred Jungle Suites", unitPrefix: "SJ Apart " },

  // Sarang Apartments
  { pattern: /SRG[-_ ]*0*(\d+)/i, complex: "Sarang Aprt.", unitPrefix: "Sarang Apart. " },
  
  // Sebelas Apartments
  { pattern: /SEB[-_ ]*0*9A/i, complex: "Sebelas Aprt.", unit: "Sebelas Aprt. 9 (2BDr)" },
  { pattern: /SEB[-_ ]*0*11A/i, complex: "Sebelas Aprt.", unit: "Sebelas Aprt. 11 (3BDr)" },
  { pattern: /SEB[-_ ]*0*(\d+)A?/i, complex: "Sebelas Aprt.", unitPrefix: "Sebelas Aprt. " },

  // Orchid Garden Villa
  { pattern: /OGV[-_ ]*V0*(\d+)/i, complex: "Orchid Garden Villa", unitPrefix: "Orchid Garden Villa " },
  
  // Standalone Villas
  { pattern: /HTN[-_ ]*0*1|hutan/i, complex: "Villas", unit: "Hutan Villa" },
  { pattern: /RMH[-_ ]*0*1|rumah/i, complex: "Villas", unit: "Rumah Villa" },
  { pattern: /TTB[-_ ]*0*1|tropical/i, complex: "Villas", unit: "Tropical Tribe Villa" },
  { pattern: /HIJ[-_ ]*0*1|hijau/i, complex: "Villas", unit: "Hijau Villa" },
  { pattern: /MNL[-_ ]*0*1|moonlight/i, complex: "Villas", unit: "Moonlight" },
  { pattern: /TBG[-_ ]*0*1|tembaga/i, complex: "Villas", unit: "Tembaga Villa" },
  { pattern: /PUS[-_ ]*0*1|putri\s*salju/i, complex: "Villas", unit: "Putri Salju" },
  { pattern: /SMR[-_ ]*0*1|semiramida/i, complex: "Villas", unit: "Semiramida" },
  { pattern: /GDH[-_ ]*0*1|garden\s*height/i, complex: "Villas", unit: "Garden Hights Villa" },
  { pattern: /nyaman.*1/i, complex: "Villas", unit: "Nyaman Villa 1 (1BDr)" },
  { pattern: /nyaman.*2/i, complex: "Villas", unit: "Nyaman Villa 2 (1BDr)" },
  { pattern: /nyaman.*3/i, complex: "Villas", unit: "Nyaman Villa 3 (2BDr)" },
];

let dynamicMappings: DynamicMapping[] = [];
let isMappingsLoaded = false;

/**
 * Load dynamic mappings from Firestore
 */
export async function loadVillaMappings() {
  if (isMappingsLoaded) return;
  try {
    const snapshot = await getDocs(collection(db, "villaMappings"));
    const records: DynamicMapping[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.guestyNickname) {
        records.push({
          guestyNickname: data.guestyNickname,
          complexType: data.complexType || "Villas",
          unitName: data.unitName || data.guestyNickname,
        });
      }
    });
    dynamicMappings = records;
    isMappingsLoaded = true;
    console.log(`Loaded ${records.length} dynamic villa mappings.`);
  } catch (err) {
    console.error("Failed to load villa mappings:", err);
  }
}

/**
 * Resolves raw reservation villa string / fields into normalized complex & unit names
 */
export function resolveReservationProperty(res?: {
  villa?: string;
  complexName?: string;
  unitName?: string;
  listingId?: string;
  complex?: string;
  unit?: string;
  villaName?: string;
} | null): PropertyMatch {
  if (!res || typeof res !== 'object') {
    return {
      complexName: 'Unknown',
      unitName: 'Unknown',
      displayName: 'Unknown'
    };
  }

  const rawVilla = (res.villa || res.villaName || '').trim();
  const rawComplex = (res.complexName || res.complex || '').trim();
  const rawUnit = (res.unitName || res.unit || '').trim();
  const combined = `${rawVilla} ${rawComplex} ${rawUnit}`.trim();

  // First try dynamic mappings exactly or partially matching
  if (isMappingsLoaded && dynamicMappings.length > 0) {
    for (const mapping of dynamicMappings) {
      if (
        combined.toLowerCase().includes(mapping.guestyNickname.toLowerCase()) || 
        rawVilla.toLowerCase() === mapping.guestyNickname.toLowerCase()
      ) {
        return {
          complexName: mapping.complexType,
          unitName: mapping.unitName,
          displayName: `${mapping.complexType} • ${mapping.unitName}`
        };
      }
    }
  }

  for (const mapping of KNOWN_PROPERTY_MAPPINGS) {
    const match = combined.match(mapping.pattern);
    if (match) {
      let unit = mapping.unit;
      if (!unit && mapping.unitPrefix && match[1]) {
        unit = `${mapping.unitPrefix}${parseInt(match[1], 10)}`;
      }
      if (!unit) {
        unit = rawUnit || rawVilla || mapping.complex;
      }
      return {
        complexName: mapping.complex,
        unitName: unit,
        displayName: `${mapping.complex} • ${unit}`
      };
    }
  }

  // Fallback heuristic if not matched by regex
  const fallbackComplex = rawComplex || rawVilla || "Unknown";
  const fallbackUnit = rawUnit || rawVilla || fallbackComplex;
  return {
    complexName: fallbackComplex,
    unitName: fallbackUnit,
    displayName: rawComplex && rawUnit && rawComplex !== rawUnit ? `${rawComplex} • ${rawUnit}` : (rawUnit || rawComplex || rawVilla || 'Unknown')
  };
}

/**
 * Normalizes a string for comparison (strips punctuation, extra whitespace, lowercase)
 */
function normalizeStr(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determines whether two property or unit strings refer to the same property
 */
export function matchesProperty(candidate: string, target: string): boolean {
  if (!candidate || !target) return false;
  const cNorm = normalizeStr(candidate);
  const tNorm = normalizeStr(target);

  if (cNorm === tNorm) return true;
  if (cNorm.replace(/\s+/g, '') === tNorm.replace(/\s+/g, '')) return true;

  const cWords = cNorm.split(' ').filter(w => w.length > 0);
  const tWords = tNorm.split(' ').filter(w => w.length > 0);
  
  function getFreq(words: string[]) {
    const f: Record<string, number> = {};
    for (const w of words) {
      f[w] = (f[w] || 0) + 1;
    }
    return f;
  }

  const cFreq = getFreq(cWords);
  const tFreq = getFreq(tWords);

  let cSubsetOfT = true;
  let tSubsetOfC = true;

  for (const w of cWords) {
    if ((cFreq[w] || 0) > (tFreq[w] || 0)) cSubsetOfT = false;
  }
  for (const w of tWords) {
    if ((tFreq[w] || 0) > (cFreq[w] || 0)) tSubsetOfC = false;
  }

  if (cSubsetOfT) return true;

  return false;
}

/**
 * Checks if a reservation belongs to the complexes / units assigned to a user
 */
export function isReservationAssignedToUser(
  reservation?: { complexName?: string; unitName?: string; villa?: string; listingId?: string; complex?: string; unit?: string; villaName?: string } | null,
  currentUser?: {
    role?: string;
    email?: string;
    assignedComplexes?: string[];
    assignedUnits?: string[];
  } | null
): boolean {
  if (!currentUser) return true;
  if (!reservation) return false;

  const assignedComplexes = currentUser.assignedComplexes || [];
  const assignedUnits = currentUser.assignedUnits || [];

  // Super administrator with no restrictions sees all
  const isSuper = currentUser.email?.toLowerCase() === 'roman@evdekimi.com';
  if (isSuper && assignedComplexes.length === 0 && assignedUnits.length === 0) {
    return true;
  }

  // If user has admin or supervisor role and has not selected specific villas/units, show all
  if ((currentUser.role === 'admin' || currentUser.role === 'supervisor') && assignedComplexes.length === 0 && assignedUnits.length === 0) {
    return true;
  }

  // If no assignments configured, non-admins might not see any or see all
  if (assignedComplexes.length === 0 && assignedUnits.length === 0) {
    return currentUser.role === 'admin' || currentUser.role === 'supervisor';
  }

  const resolved = resolveReservationProperty(reservation);
  const resComplex = resolved.complexName;
  const resUnit = resolved.unitName;
  const rawVilla = reservation.villa || reservation.villaName || '';

  // 1. Check if reservation matches any of the assigned units
  if (assignedUnits.length > 0) {
    const unitMatch = assignedUnits.some(userUnit => {
      return (
        matchesProperty(userUnit, resUnit) ||
        matchesProperty(userUnit, rawVilla) ||
        matchesProperty(userUnit, `${resComplex} ${resUnit}`)
      );
    });
    // Frontdesk users with specific unit assignments are strictly bounded to those units
    if (currentUser.role === 'frontdesk') {
      return unitMatch;
    }
    if (unitMatch) return true;
  }

  // 2. Check if reservation matches any of the assigned complexes
  if (assignedComplexes.length > 0) {
    const complexMatch = assignedComplexes.some(userComplex => {
      return (
        matchesProperty(userComplex, resComplex) ||
        matchesProperty(userComplex, rawVilla) ||
        matchesProperty(userComplex, `${resComplex} ${resUnit}`)
      );
    });
    if (complexMatch) return true;
  }

  return false;
}
