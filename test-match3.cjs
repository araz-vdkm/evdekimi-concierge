const { isReservationAssignedToUser, resolveReservationProperty } = require('./test-match-compiled.cjs');
const currentUser = {
  role: 'supervisor',
  assignedComplexes: ['Dragon Stone Suites', 'Dragon Stone Villas'],
  assignedUnits: ['DragonStone V1', 'DragonStone V2', 'DragonStone V3', 'DragonStone V4', 'DragonStone V5', 'DragonStone V6', 'DragonStone V7', 'DragonStone V8', 'DragonStone V9', 'DragonStone V10', 'DragonStone A1', 'DragonStone A2', 'DragonStone A3', 'DragonStone A4', 'DragonStone A5', 'DragonStone A6', 'DragonStone A7', 'DragonStone A8']
};

console.log('Resolving Orchid Garden Villa 1 (1BDr):', resolveReservationProperty({ villa: 'Orchid Garden Villa 1 (1BDr)' }));
console.log('Resolving Hijau Villa:', resolveReservationProperty({ villa: 'Hijau Villa' }));

console.log('Is Assigned Hijau Villa:', isReservationAssignedToUser({ villa: 'Hijau Villa' }, currentUser));
