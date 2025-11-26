// Priority tiers per blood type
// Returns array of arrays (tiers), where each tier is list of donor blood groups to try

export function getPriorityTiers(patient) {
  const p = String(patient || '').toUpperCase();
  switch (p) {
    case 'A+':
      return [['A+'], ['A-'], ['O+'], ['O-']];
    case 'A-':
      return [['A-'], ['O-']];
    case 'B+':
      return [['B+'], ['B-'], ['O+'], ['O-']];
    case 'B-':
      return [['B-'], ['O-']];
    case 'AB+':
      return [['A+'], ['A-'], ['B+'], ['B-'], ['AB+'], ['AB-'], ['O+'], ['O-']];
    case 'AB-':
      return [['AB-'], ['A-'], ['B-'], ['O-']];
    case 'O+':
      return [['O+'], ['O-']];
    case 'O-':
      return [['O-']];
    default:
      return [];
  }
}

export function tierLabel(indexZero) {
  return `Tier ${indexZero + 1}`;
}
