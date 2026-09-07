/**
 * Villa -> Villa Manager (on-site staff responsible for a villa/unit) mapping,
 * imported from the "Villas names mapping (API and Google sheets)" spreadsheet.
 *
 * `sheetName` matches the `unitName` values already used throughout the app
 * (Guest.unitName, reservation.unitName, UserAccount.assignedUnits), so these
 * values can be assigned directly into a UserAccount's `assignedUnits` array.
 *
 * Used by the "Import Villa Assignments" tool in User Management to bulk-set
 * assignedUnits for the Villa Manager each row is matched to, and by the
 * Reporting > Staff KPI panel to show which villas are unassigned.
 */

export interface VillaManagerMappingRow {
  /** Raw PMS (Guesty) listing nickname, e.g. "DGS-A1 | Dragon Stone Apt" */
  guestyNickname: string;
  /** Matches Guest.unitName / reservation.unitName / UserAccount.assignedUnits entries */
  sheetName: string;
  investorCode: string;
  /** On-site staff member responsible for this villa/unit */
  villaManager: string;
  email: string;
}

export const VILLA_MANAGER_MAPPING: VillaManagerMappingRow[] = [
  { guestyNickname: "DGS-A1 | Dragon Stone Apt", sheetName: "DragonStone A1", investorCode: "DT07IW, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-A2 | Dragon Stone Apt", sheetName: "DragonStone A2", investorCode: "WP41XP, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-A3 | Dragon Stone Apt", sheetName: "DragonStone A3", investorCode: "JW06BU, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-A4 | Dragon Stone Apt", sheetName: "DragonStone A4", investorCode: "DT07IW, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-A5 | Dragon Stone Apt", sheetName: "DragonStone A5", investorCode: "YB01GF, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-A6 | Dragon Stone Apt", sheetName: "DragonStone A6", investorCode: "AF65FP, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-A7 | Dragon Stone Apt", sheetName: "DragonStone A7", investorCode: "ZX03VC, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-A8 | Dragon Stone Apt", sheetName: "DragonStone A8", investorCode: "GM38MM, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-V01 | Dragon Stone Villas", sheetName: "DragonStone V1", investorCode: "SN82BV, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-V02 | Dragon Stone Villas", sheetName: "DragonStone V2", investorCode: "UK44FF, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-V03 | Dragon Stone Villas", sheetName: "DragonStone V3", investorCode: "UK44FF, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-V04 | Dragon Stone Villas", sheetName: "DragonStone V4", investorCode: "EP13FQ, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-V05 | Dragon Stone Villas", sheetName: "DragonStone V5", investorCode: "QE96ZB, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-V06 | Dragon Stone Villas", sheetName: "DragonStone V6", investorCode: "FS11EP, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-V07 | Dragon Stone Villas", sheetName: "DragonStone V7", investorCode: "TT27JU, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-V08 | Dragon Stone Villas", sheetName: "DragonStone V8", investorCode: "KA39JP, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-V09 | Dragon Stone Villas", sheetName: "DragonStone V9", investorCode: "AZ36NQ, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "DGS-V10 | Dragon Stone Villas", sheetName: "DragonStone V10", investorCode: "SL03DB, 7777777", villaManager: "AA Ngurah Indra Kumala", email: "aangurahindrakumala@gmail.com" },
  { guestyNickname: "GDH-001 | Garden Heights EVD", sheetName: "Garden Hights Villa", investorCode: "XC40FN, 7777777", villaManager: "I Made Suandika", email: "suandikabello@gmail.com" },
  { guestyNickname: "HIJ-001 | Hijau Villa by Evd", sheetName: "Hijau Villa", investorCode: "AF65FP, 7777777", villaManager: "Mulia Michael", email: "muliamichael39@gmail.com" },
  { guestyNickname: "HTN-001 | Hutan V", sheetName: "Hutan Villa", investorCode: "VA86IE, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "MNL-001 | Moonlight by EVD", sheetName: "Moonlight", investorCode: "YI00WP, 7777777", villaManager: "I Made Suandika", email: "suandikabello@gmail.com" },
  { guestyNickname: "OGV-V1 | Orchid Garden Villa ", sheetName: "Nyaman Villa 1 (1BDr)", investorCode: "US59JO, 7777777", villaManager: "I Made Suandika", email: "suandikabello@gmail.com" },
  { guestyNickname: "OGV-V2 | Orchid Garden Villa ", sheetName: "Nyaman Villa 2 (1BDr)", investorCode: "US59JO, 7777777", villaManager: "I Made Suandika", email: "suandikabello@gmail.com" },
  { guestyNickname: "OGV-V3 | Orchid Garden Villa ", sheetName: "Nyaman Villa 3 (2BDr)", investorCode: "US59JO, 7777777", villaManager: "I Made Suandika", email: "suandikabello@gmail.com" },
  { guestyNickname: "PUS-001 | Putri Salju", sheetName: "Putri Salju", investorCode: "VQ85SB, 7777777", villaManager: "I Made Suandika", email: "suandikabello@gmail.com" },
  { guestyNickname: "RMH-001 | RumahVilla", sheetName: "Rumah Villa", investorCode: "FH02CH, 7777777", villaManager: "Mulia Michael", email: "muliamichael39@gmail.com" },
  { guestyNickname: "SCJ-01A | Sacred Jungle Apartments", sheetName: "SJ Apart 1 (Mezanine)", investorCode: "QJ32GY, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-01V | Sacred Jungle Villa", sheetName: "SJ 1 Villa 1", investorCode: "ZN98AS, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-02A | Sacred Jungle Apartments", sheetName: "SJ Apart 2 (Mezanine)", investorCode: "QP17EJ, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-02V | Sacred Jungle Villa", sheetName: "SJ 1 Villa 2", investorCode: "RN26CL, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-03A | Sacred Jungle Apartments", sheetName: "SJ Apart 3 (Mezanine)", investorCode: "ZQ56VU, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-03V | Sacred Jungle Villa", sheetName: "SJ 1 Villa 3", investorCode: "LY82NE, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-04A | Sacred Jungle Apartments", sheetName: "SJ Apart 4", investorCode: "FA32FY, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-04V | Sacred Jungle Villa", sheetName: "SJ 2 Villa 4", investorCode: "KH92ZP, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-05A| Sacred Jungle Apartments", sheetName: "SJ Apart 5", investorCode: "WI63XL, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-05V | Sacred Jungle Villa", sheetName: "SJ 2 Villa 5", investorCode: "KH92ZP, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-06A | Sacred Jungle Apartments", sheetName: "SJ Apart 6", investorCode: "GG52PX, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-06V | Sacred Jungle Villa", sheetName: "SJ 2 Villa 6", investorCode: "KH92ZP, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-07A | Sacred Jungle Apartments", sheetName: "SJ Apart 7", investorCode: "KF95CB, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-08A | Sacred Jungle Apartments", sheetName: "SJ Apart 8", investorCode: "CQ74BJ, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SCJ-09A | Sacred Jungle Apartments", sheetName: "SJ Apart 9 (2BDr)", investorCode: "FH02CH, 7777777", villaManager: "Darma Wan", email: "darmawanketut01@gmail.com" },
  { guestyNickname: "SEB-01A | Sebelas Apartment", sheetName: "Sebelas Aprt. 1", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SEB-02A | Sebelas Apartment", sheetName: "Sebelas Aprt. 2", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SEB-03A | Sebelas Apartment", sheetName: "Sebelas Aprt. 3", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SEB-04A | Sebelas Apartment", sheetName: "Sebelas Aprt. 4", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SEB-05A | Sebelas Apartment", sheetName: "Sebelas Aprt. 5", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SEB-06A | Sebelas Apartment", sheetName: "Sebelas Aprt. 6", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SEB-07A | Sebelas Apartment", sheetName: "Sebelas Aprt. 7", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SEB-08A | Sebelas Apartment", sheetName: "Sebelas Aprt. 8", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SEB-09A | Sebelas Apartment", sheetName: "Sebelas Aprt. 9 (2BDr)", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SEB-10A | Sebelas Apartment", sheetName: "Sebelas Aprt. 10", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SEB-11A | Sebelas Apartment", sheetName: "Sebelas Aprt. 11 (3BDr)", investorCode: "WY04BT, 7777777", villaManager: "Ketut Agus Didit Suardi", email: "ketutdidit123@gmail.com" },
  { guestyNickname: "SMR - 001 | Semiramida Villa ", sheetName: "Semiramida", investorCode: "WY04BT, 7777777", villaManager: "I Made Suandika", email: "suandikabello@gmail.com" },
  { guestyNickname: "SRG-001 | Sarang AP1", sheetName: "Sarang Apart. 1", investorCode: "AF65FP, 7777777", villaManager: "Mulia Michael", email: "muliamichael39@gmail.com" },
  { guestyNickname: "SRG-002 | Sarang AP2", sheetName: "Sarang Apart. 2", investorCode: "AF65FP, 7777777", villaManager: "Mulia Michael", email: "muliamichael39@gmail.com" },
  { guestyNickname: "SRG-003 | Sarang AP3", sheetName: "Sarang Apart. 3", investorCode: "XW26PD, 7777777", villaManager: "Mulia Michael", email: "muliamichael39@gmail.com" },
  { guestyNickname: "SRG-004 | Sarang AP4", sheetName: "Sarang Apart. 4", investorCode: "FH02CH, 7777777", villaManager: "Mulia Michael", email: "muliamichael39@gmail.com" },
  { guestyNickname: "SRG-005 | Sarang AP5", sheetName: "Sarang Apart. 5", investorCode: "TO75AI, 7777777", villaManager: "Mulia Michael", email: "muliamichael39@gmail.com" },
  { guestyNickname: "SRG-006 | Sarang Ap6", sheetName: "Sarang Apart. 6", investorCode: "AY88HB, 7777777", villaManager: "Mulia Michael", email: "muliamichael39@gmail.com" },
  { guestyNickname: "TBG-001 | Tembaga by EVD", sheetName: "Tembaga Villa", investorCode: "AF65FP, 7777777", villaManager: "I Made Suandika", email: "suandikabello@gmail.com" },
  { guestyNickname: "TTB-001 | Tropical T", sheetName: "Tropical Tribe Villa", investorCode: "VA86IE, 7777777", villaManager: "Mulia Michael", email: "muliamichael39@gmail.com" },
];

/** Unique villa managers, each with the full list of units/villas they are responsible for. */
export interface VillaManagerGroup {
  villaManager: string;
  email: string;
  units: string[];
}

export const VILLA_MANAGER_GROUPS: VillaManagerGroup[] = (() => {
  const byManager = new Map<string, VillaManagerGroup>();
  for (const row of VILLA_MANAGER_MAPPING) {
    if (!row.villaManager) continue;
    if (!byManager.has(row.villaManager)) {
      byManager.set(row.villaManager, { villaManager: row.villaManager, email: row.email, units: [] });
    }
    byManager.get(row.villaManager)!.units.push(row.sheetName);
  }
  return Array.from(byManager.values());
})();
