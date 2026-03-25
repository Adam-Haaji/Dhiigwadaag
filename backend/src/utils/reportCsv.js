// CSV helpers and flat row mappers for Admin reports (Users, Donors, Requests, Donations)
// NOTE: This file is reporting-only. It does not change any database schema or core business logic.

export const EMPTY = '—';

export function formatDate(value) {
  if (!value) return EMPTY;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const iso = d.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  return iso.slice(0, 16).replace('T', ' ');
}

export function formatLastDonation(value) {
  if (!value) return 'Never donated';
  return formatDate(value);
}

export function formatBool(value) {
  if (value === null || value === undefined) return EMPTY;
  return value ? 'true' : 'false';
}

export function formatValue(value) {
  if (value === null || value === undefined || value === '') return EMPTY;
  return String(value);
}

export function safeId(id) {
  if (!id) return EMPTY;
  return typeof id === 'string' ? id : String(id);
}

// Simple CSV builder that preserves column order and quotes all values.
export function rowsToCsv(columns, rows) {
  const header = columns.map(c => c.label);
  const lines = [];
  const escapeCell = (val) => {
    const s = val == null ? '' : String(val);
    const escaped = s.replace(/"/g, '""');
    return `"${escaped}"`;
  };
  lines.push(header.map(escapeCell).join(','));
  for (const row of rows) {
    const cells = columns.map(col => escapeCell(row[col.key] ?? EMPTY));
    lines.push(cells.join(','));
  }
  return lines.join('\r\n');
}

// ---------- USERS (Accounts) ----------

export const USERS_REPORT_COLUMNS = [
  { key: 'userId',    label: 'User ID' },
  { key: 'name',      label: 'Name' },
  { key: 'email',     label: 'Email' },
  { key: 'phone',     label: 'Phone' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
  { key: 'status',    label: 'Status' },
];

function computeUserStatus(user) {
  if (user && typeof user.status === 'string' && user.status.trim()) {
    return user.status.toLowerCase();
  }
  if (typeof user?.isActive === 'boolean') {
    return user.isActive ? 'active' : 'inactive';
  }
  return EMPTY;
}

export function mapUserToUsersReportRow(user) {
  return {
    userId:    safeId(user?._id),
    name:      formatValue(user?.name),
    email:     formatValue(user?.email),
    phone:     formatValue(user?.phone),
    createdAt: formatDate(user?.createdAt),
    updatedAt: formatDate(user?.updatedAt),
    status:    computeUserStatus(user),
  };
}

// ---------- DONORS ----------

export const DONORS_REPORT_COLUMNS = [
  { key: 'donorId',                     label: 'donorId' },
  { key: 'fullName',                    label: 'fullName' },
  { key: 'phone',                       label: 'phone' },
  { key: 'email',                       label: 'email' },
  { key: 'district',                    label: 'district' },
  { key: 'bloodGroup',                  label: 'bloodGroup' },
  { key: 'gender',                      label: 'gender' },
  { key: 'age',                         label: 'age' },
  { key: 'weightKg',                    label: 'weightKg' },
  { key: 'availabilityStatus',          label: 'availabilityStatus' },
  { key: 'isActive',                    label: 'isActive' },
  { key: 'lastDonationDate',            label: 'lastDonationDate' },
  { key: 'nextAvailableDate',           label: 'nextAvailableDate' },
  { key: 'eligibilityStatus',           label: 'eligibilityStatus' },
  { key: 'eligibilityConfidencePercent',label: 'eligibilityConfidencePercent' },
  { key: 'eligibilityCheckedAt',        label: 'eligibilityCheckedAt' },
  { key: 'eligibilityReason',           label: 'eligibilityReason' },
  { key: 'createdAt',                   label: 'createdAt' },
];

export function mapDonorToDonorsReportRow(donor) {
  const user = donor?.user || {};
  const confPercent =
    donor?.eligibilityConfidencePercent != null
      ? donor.eligibilityConfidencePercent
      : donor?.eligibilityConfidence != null
        ? Math.round(Number(donor.eligibilityConfidence) * 100)
        : null;

  return {
    donorId:                     safeId(donor?._id),
    fullName:                    formatValue(donor?.fullName || user.name),
    phone:                       formatValue(donor?.phone || user.phone),
    email:                       formatValue(donor?.email || user.email),
    district:                    formatValue(donor?.district),
    bloodGroup:                  formatValue(donor?.bloodGroup),
    gender:                      formatValue(donor?.gender),
    age:                         formatValue(donor?.age),
    weightKg:                    formatValue(donor?.weightKg),
    availabilityStatus:          formatValue(donor?.availabilityStatus),
    isActive:                    formatBool(donor?.isActive),
    lastDonationDate:            formatLastDonation(donor?.lastDonationDate),
    nextAvailableDate:           formatDate(donor?.nextAvailableDate || donor?.nextEligibilityDate),
    eligibilityStatus:           formatValue(donor?.eligibilityStatus),
    eligibilityConfidencePercent: formatValue(confPercent),
    eligibilityCheckedAt:        formatDate(donor?.eligibilityCheckedAt),
    eligibilityReason:           formatValue(donor?.eligibilityReason),
    createdAt:                   formatDate(donor?.createdAt),
  };
}

// ---------- REQUESTS ----------

export const REQUESTS_REPORT_COLUMNS = [
  { key: 'requestId',      label: 'requestId' },
  { key: 'requesterId',    label: 'requesterId' },
  { key: 'requesterName',  label: 'requesterName' },
  { key: 'requesterPhone', label: 'requesterPhone' },
  { key: 'patientName',    label: 'patientName' },
  { key: 'bloodGroup',     label: 'bloodGroup' },
  { key: 'district',       label: 'district' },
  { key: 'units',          label: 'units' },
  { key: 'urgencyLevel',   label: 'urgencyLevel' },
  { key: 'status',         label: 'status' },
  { key: 'hospital',       label: 'hospital' },
  { key: 'contactPhone',   label: 'contactPhone' },
  { key: 'donorId',        label: 'donorId' },
  { key: 'fulfilledBy',    label: 'fulfilledBy' },
  { key: 'createdAt',      label: 'createdAt' },
  { key: 'updatedAt',      label: 'updatedAt' },
];

export function mapRequestToRequestsReportRow(req) {
  const requester = req?.requester || {};
  return {
    requestId:      safeId(req?._id),
    requesterId:    formatValue(req?.requesterId),
    requesterName:  formatValue(requester.name),
    requesterPhone: formatValue(requester.phone),
    patientName:    formatValue(req?.patientName),
    bloodGroup:     formatValue(req?.bloodGroup || req?.bloodType),
    district:       formatValue(req?.district || req?.location),
    units:          formatValue(req?.units),
    urgencyLevel:   formatValue(req?.urgencyLevel || req?.urgency),
    status:         formatValue(req?.status),
    hospital:       formatValue(req?.hospital),
    contactPhone:   formatValue(req?.contactPhone),
    donorId:        formatValue(req?.donorId),
    fulfilledBy:    formatValue(req?.fulfilledBy),
    createdAt:      formatDate(req?.createdAt),
    updatedAt:      formatDate(req?.updatedAt),
  };
}

// ---------- DONATIONS ----------

export const DONATIONS_REPORT_COLUMNS = [
  { key: 'donationId',     label: 'donationId' },
  { key: 'requestId',      label: 'requestId' },
  { key: 'donationDate',   label: 'donationDate' },
  { key: 'status',         label: 'status' },
  { key: 'units',          label: 'units' },
  { key: 'hospital',       label: 'hospital' },
  { key: 'bloodGroup',     label: 'bloodGroup' },
  { key: 'district',       label: 'district' },
  { key: 'patientName',    label: 'patientName' },
  { key: 'donorId',        label: 'donorId' },
  { key: 'donorName',      label: 'donorName' },
  { key: 'donorPhone',     label: 'donorPhone' },
  { key: 'requesterName',  label: 'requesterName' },
  { key: 'requesterPhone', label: 'requesterPhone' },
  { key: 'createdAt',      label: 'createdAt' },
  { key: 'notes',          label: 'notes' },
];

export function mapDonationToDonationsReportRow(d) {
  const donor = d?.donor || {};
  const requester = d?.requester || {};
  return {
    donationId:     safeId(d?._id),
    requestId:      formatValue(d?.requestId),
    donationDate:   formatDate(d?.donationDate),
    status:         formatValue(d?.status),
    units:          formatValue(d?.units),
    hospital:       formatValue(d?.hospital),
    bloodGroup:     formatValue(d?.bloodType || d?.bloodGroup),
    district:       formatValue(d?.location || d?.district),
    patientName:    formatValue(d?.patientName),
    donorId:        safeId(donor?._id),
    donorName:      formatValue(donor.name || donor.fullName),
    donorPhone:     formatValue(donor.phone),
    requesterName:  formatValue(requester.name),
    requesterPhone: formatValue(requester.phone),
    createdAt:      formatDate(d?.createdAt),
    notes:          formatValue(d?.notes || d?.additionalNote || d?.reason),
  };
}

