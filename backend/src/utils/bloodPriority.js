// Priority tiers per blood type
// Returns array of arrays (tiers), where each tier is list of donor blood groups to try

export function getPriorityTiers(patient) {
  const p = String(patient || '').toUpperCase();
  switch (p) {
    // Exact match (Tier 1) then ALL compatible types together as Tier 2
    case 'O-':
      return [['O-']];
    case 'O+':
      return [['O+'], ['O-']];
    case 'A-':
      return [['A-'], ['O-']];
    case 'A+':
      return [['A+'], ['A-','O+','O-']];
    case 'B-':
      return [['B-'], ['O-']];
    case 'B+':
      return [['B+'], ['B-','O+','O-']];
    case 'AB-':
      return [['AB-'], ['A-','B-','O-']];
    case 'AB+':
      return [['AB+'], ['A+','A-','B+','B-','O+','O-','AB-']];
    default:
      return [];
  }
}

export function tierLabel(indexZero) {
  return `Tier ${indexZero + 1}`;
}
