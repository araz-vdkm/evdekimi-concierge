const { isReservationAssignedToUser, resolveReservationProperty } = require('./test-match-compiled.cjs');

const user = {
  role: 'supervisor',
  assignedComplexes: ['Dragon Stone Suites', 'Dragon Stone Villas'],
  assignedUnits: ['DragonStone V1', 'DragonStone V2', 'DragonStone V3', 'DragonStone V4', 'DragonStone V5', 'DragonStone V6', 'DragonStone V7', 'DragonStone V8', 'DragonStone V9', 'DragonStone V10', 'DragonStone A1', 'DragonStone A2', 'DragonStone A3', 'DragonStone A4', 'DragonStone A5', 'DragonStone A6', 'DragonStone A7', 'DragonStone A8']
};

console.log('Resolving V6:', resolveReservationProperty({ villa: 'DragonStone V6' }));
console.log('Resolving V6 (res format):', resolveReservationProperty({ complexName: "Dragon Stone Villas", unitName: "DragonStone V6" }));
console.log('Resolving A2:', resolveReservationProperty({ complexName: "Dragon Stone Suites", unitName: "DragonStone A2" }));

console.log('Is V6 assigned:', isReservationAssignedToUser({ complexName: "Dragon Stone Villas", unitName: "DragonStone V6" }, user));
console.log('Is A2 assigned:', isReservationAssignedToUser({ complexName: "Dragon Stone Suites", unitName: "DragonStone A2" }, user));

// Try from Home.tsx filtering structure
const r = {
  complexName: "Dragon Stone Villas",
  unitName: "DragonStone V6",
  villa: "Dragon Stone Villas • DragonStone V6"
};
console.log('Is V6 (from Home) assigned:', isReservationAssignedToUser(r, user));
