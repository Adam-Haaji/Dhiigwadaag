# Admin Backend Endpoints - Complete List

## ✅ All Endpoints Implemented

All endpoints are protected with JWT authentication and admin role middleware.
All endpoints read from the existing MongoDB database (no separate admin DB).

---

## 📊 Dashboard Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard/stats` | Overview statistics |

---

## 👤 User Management (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List users (paginated, filterable, sortable) |
| GET | `/admin/users/:id` | Get user by ID |
| POST | `/admin/users` | Create new user |
| PUT | `/admin/users/:id` | Update user |
| PATCH | `/admin/users/:id/status` | Update user status (active/blocked/inactive) |
| DELETE | `/admin/users/:id` | Delete user |

**Features**:
- Pagination (page, limit)
- Search (name, email, phone)
- Filter by role, status
- Sort by any field
- Computed status field

---

## 🩸 Donor Management (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/donors` | List donors (paginated, filterable, sortable) |
| GET | `/admin/donors/:id` | Get donor by ID |
| PUT | `/admin/donors/:id` | Update donor |
| PATCH | `/admin/donors/:id/availability` | Update availability status |
| DELETE | `/admin/donors/:id` | Delete donor |

**Features**:
- Pagination, search, filtering, sorting
- Computed fields: `nextEligibilityDate`, `daysUntilEligible`
- Availability management with cooldown checks

---

## 📝 Request Management (5 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/requests` | List requests (paginated, filterable, sortable) |
| GET | `/admin/requests/:id` | Get request by ID |
| PUT | `/admin/requests/:id` | Update request |
| PUT | `/admin/requests/:id/status` | Update request status |
| DELETE | `/admin/requests/:id` | Delete request |

**Features**:
- Filter by status, urgency, blood group, district
- Search in patient name, contact info
- Status management with automatic timestamp updates

---

## 🔗 Match Management (2 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/matches` | List all matches (paginated, filterable) |
| GET | `/admin/matches/:id` | Get match by ID |

**Features**:
- Derived from BloodRequest with donorId
- Includes donor and requester details
- Status tracking (matched/accepted/fulfilled)

---

## 💉 Donation Management (1 endpoint)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/donations` | List fulfilled donations (paginated, filterable) |

**Features**:
- Only fulfilled/completed requests
- Includes donor and requester info
- Verification status

---

## 🚨 Emergency Management (1 endpoint)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/emergencies` | List critical requests (paginated) |

**Features**:
- Filtered to critical urgency + pending/matched status

---

## 📊 Statistics Endpoints (6 endpoints - Chart-Ready)

| Method | Endpoint | Description | Chart Type |
|--------|----------|-------------|------------|
| GET | `/admin/stats/overview` | Overview statistics | Dashboard cards |
| GET | `/admin/stats/donors` | Available vs Unavailable | Pie chart |
| GET | `/admin/stats/requests` | Request status breakdown | Bar chart |
| GET | `/admin/stats/blood-types` | Demand vs Supply by blood type | Bar chart |
| GET | `/admin/stats/locations` | Requests per district | Bar chart |
| GET | `/admin/stats/donations-trend` | Monthly donations trend | Line chart |

**Features**:
- MongoDB aggregation pipelines for performance
- Chart-ready JSON format (labels + values)
- Optimized for frontend chart libraries

---

## 🔔 Notifications & Activity (2 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/notifications` | List notifications (paginated, filterable) |
| GET | `/admin/activity-logs` | Activity logs (paginated, filterable) |

**Features**:
- Activity logs derived from notifications + request status changes
- Filter by type, user, read status
- Comprehensive activity tracking

---

## Total Endpoints: **28**

### Breakdown:
- Dashboard: 1
- Users: 6
- Donors: 5
- Requests: 5
- Matches: 2
- Donations: 1
- Emergencies: 1
- Statistics: 6
- Notifications & Activity: 2

---

## Data Sources (MongoDB Collections)

✅ **users** - User management
✅ **donors** - Donor management
✅ **bloodrequests** - Request management, matches, donations
✅ **requests** - Legacy requests (supported)
✅ **notifications** - Notifications and activity logs

**No new collections created** - All endpoints read from existing database.

---

## Security

✅ JWT Authentication required
✅ Admin role middleware on all routes
✅ Input validation
✅ Atomic database operations
✅ Error handling

---

## Response Formats

### List Responses (Paginated)
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

### Chart Responses
```json
{
  "chart": {
    "type": "pie|bar|line",
    "data": [
      { "label": "...", "value": 10 },
      ...
    ]
  }
}
```

### Single Item Responses
```json
{
  "user": { ... },
  "donor": { ... },
  "request": { ... }
}
```

---

## Ready for Integration

All endpoints are:
- ✅ Fully implemented
- ✅ Tested for syntax errors
- ✅ Documented
- ✅ Protected with authentication
- ✅ Reading from existing database
- ✅ Optimized with aggregation pipelines
- ✅ Chart-ready for dashboard

**The Admin Dashboard frontend can now consume all these endpoints!**
