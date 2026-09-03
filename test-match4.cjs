const { matchesProperty, resolveReservationProperty, isReservationAssignedToUser } = require('./test-match-compiled.cjs');

const res1 = resolveReservationProperty({ villa: 'Orchid Garden Villa 1 (1BDr)' });
console.log('Resolving Orchid Garden:', res1);

const res2 = resolveReservationProperty({ complexName: 'Villas', unitName: 'Orchid Garden Villa 1 (1BDr)' });
console.log('Resolving Orchid Garden with complex:', res2);

console.log('Match Orchid Unit:', matchesProperty('Orchid Garden Villa 1 (1BDr)', res1.unitName));

console.log('Is Orchid Assigned?', isReservationAssignedToUser({ villa: 'Orchid Garden Villa 1 (1BDr)' }, { 
  role: 'supervisor',
  assignedComplexes: [],
  assignedUnits: ['Orchid Garden Villa 1 (1BDr)']
}));

console.log('Is Orchid Assigned if complex selected?', isReservationAssignedToUser({ villa: 'Orchid Garden Villa 1 (1BDr)' }, { 
  role: 'supervisor',
  assignedComplexes: ['Orchid Garden Villa'],
  assignedUnits: []
}));
