/* End-to-end smoke test for real-time matching.
   Creates a donor (Donor model) and a blood request with same blood group & district.
   Verifies immediate match and donor reservation. */

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5000';

async function req(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);
  return data;
}

function assert(cond, msg) { if (!cond) throw new Error(`Assertion failed: ${msg}`); }

const unique = Date.now();
const bloodGroup = 'A+'; // change to test different groups
const district = 'Hodan';
const donorEmail = `donor+${unique}@example.com`;
const reqEmail = `req+${unique}@example.com`;
const password = 'Passw0rd!';

// 0) Health with retry (helps avoid race if server just restarted)
async function waitHealth(timeoutMs = 30000) {
  const t0 = Date.now();
  let lastErr;
  while (Date.now() - t0 < timeoutMs) {
    try {
      const h = await req('/api/health');
      if (h && h.status === 'ok') return h;
    } catch (e) { lastErr = e; }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Health check failed for ${BASE}: ${lastErr?.message || lastErr || 'unknown'}`);
}

console.log('[smoke-match] BASE_URL =', BASE);
const health = await waitHealth();
console.log('Health:', health);

// Helper signup/login
async function signupAndLogin(email, extra = {}) {
  await req('/api/auth/signup', { method: 'POST', body: { name: email.split('@')[0], email, password, ...extra } });
  const login = await req('/api/auth/login', { method: 'POST', body: { email, password } });
  assert(login.token, 'login token present');
  return login.token;
}

// 1) Create donor user and donor profile
const donorToken = await signupAndLogin(donorEmail);
const ninetyFiveDaysAgo = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString();
const donorCreate = await req('/api/donors', {
  method: 'POST',
  token: donorToken,
  body: {
    fullName: 'Test Donor',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    phone: '612000001',
    email: donorEmail,
    district,
    bloodGroup,
    weightKg: 70,
    consentGiven: true,
    emergencyContact: { name: 'EC', relationship: 'Friend', phone: '611000002' },
    lastDonationDate: ninetyFiveDaysAgo,
    availabilityStatus: 'available',
    donations: [],
  },
});
console.log('Donor created:', donorCreate?.donor?._id || donorCreate?._id);

// 2) Create requester and create blood request
const requesterToken = await signupAndLogin(reqEmail);
const br = await req('/api/blood-requests', {
  method: 'POST',
  token: requesterToken,
  body: {
    patientName: 'Patient Match',
    bloodGroup,
    district,
    units: 1,
    contactPerson: 'Requester',
    contactPhone: '613000003',
    urgencyLevel: 'critical',
    reason: 'Test',
    additionalNote: '',
  },
});
const requestId = br?.request?._id || br?._id;
assert(requestId, 'blood request created');
console.log('Blood request created:', requestId);

// 3) Poll once to allow async match hook
await new Promise(r => setTimeout(r, 500));
const got = await req(`/api/blood-requests/${requestId}`, { token: requesterToken });
console.log('Blood request after match:', { status: got.status, donorId: got.donorId });
assert(got.status === 'matched' && got.donorId, 'request matched and donor linked');

console.log('\nSMOKE MATCH OK');
