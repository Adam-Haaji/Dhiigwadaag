/* Smoke test for backend API flows */
const BASE = process.env.BASE_URL || 'http://localhost:5000';

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
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);
  return data;
}

function assert(cond, msg) { if (!cond) throw new Error(`Assertion failed: ${msg}`); }

const unique = Date.now();
const email = `test+${unique}@example.com`;
const pwd = 'Passw0rd!';
const bloodType = 'O+';
const city = `TestCity${unique}`;

// 1) Health
const health = await req('/api/health');
console.log('Health:', health);
assert(health.status === 'ok', 'health ok');

// 2) Signup
await req('/api/auth/signup', { method: 'POST', body: {
  name: 'Tester', email, password: pwd, bloodType, role: 'Requester', location: city, phone: '1234567890'
}});
console.log('Signup created for', email);

// 3) Login
const login = await req('/api/auth/login', { method: 'POST', body: { email, password: pwd } });
assert(login.token, 'login token present');
const token = login.token;
console.log('Login success');

// 4) Me
const me = await req('/api/users/me', { token });
assert(me && me.email === email.toLowerCase(), 'me profile email');
console.log('Me:', { id: me._id, role: me.role });

// 5) Register as donor
const donor = await req('/api/donors', { method: 'POST', token, body: { name: 'Tester Donor', phone: '1234567890', bloodType, location: city, availability: true } });
assert(donor.role === 'Donor', 'role updated to Donor');
console.log('Registered as donor');

// 6) Search donors
const donors = await req(`/api/donors/search?bloodType=${encodeURIComponent(bloodType)}&city=${encodeURIComponent(city)}&availability=true`);
assert(Array.isArray(donors) && donors.length >= 1, 'donors found');
console.log('Search donors found', donors.length);

// 7) Create request (will notify matching donors)
const rq = await req('/api/requests', { method: 'POST', token, body: { patientName: 'Patient X', bloodType, location: city, urgency: 'High' } });
assert(rq && rq._id, 'request created');
console.log('Request created', rq._id);

// Give notification insert a moment
await new Promise(r => setTimeout(r, 200));

// 8) Notifications
const notifs1 = await req('/api/notifications', { token });
assert(Array.isArray(notifs1), 'notifications array');
console.log('Notifications count after request:', notifs1.length);

// 9) Emergency broadcast
const em = await req('/api/requests/emergency', { method: 'POST', token, body: { bloodType, location: city, message: 'Smoke test emergency' } });
assert(em && typeof em.notified === 'number', 'emergency notified count');
console.log('Emergency notified:', em.notified);

// 10) Notifications again
const notifs2 = await req('/api/notifications', { token });
assert(notifs2.length >= notifs1.length, 'notifications increased or equal');
console.log('Notifications count after emergency:', notifs2.length);

// 11) Mark all read
await req('/api/notifications/mark-all-read', { method: 'POST', token });
console.log('Marked all read');

console.log('\nSMOKE TEST OK');