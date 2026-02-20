# Admin Endpoints - Quick Reference Card

## 🔐 Authentication
All endpoints require: `Authorization: Bearer <token>` header
User must have `role: "admin"` in database

---

## 📊 Dashboard Home
```
GET /admin/dashboard/stats
```

---

## 👤 Users
```
GET    /admin/users              # List (page, limit, role, search, status, sortBy, sortOrder)
GET    /admin/users/:id          # Get by ID
POST   /admin/users              # Create { name, email, password, role }
PUT    /admin/users/:id          # Update { name, email, role, phone, bloodType, location }
PATCH  /admin/users/:id/status   # Update status { status: "active"|"blocked"|"inactive" }
DELETE /admin/users/:id          # Delete
```

---

## 🩸 Donors
```
GET    /admin/donors                    # List (page, limit, availability, bloodGroup, district, search, sortBy, sortOrder)
GET    /admin/donors/:id               # Get by ID
PUT    /admin/donors/:id               # Update { fullName, phone, email, district, bloodGroup, weightKg, availabilityStatus, isActive }
PATCH  /admin/donors/:id/availability # Update availability { availabilityStatus: "available"|"unavailable" }
DELETE /admin/donors/:id               # Delete
```

---

## 📝 Requests
```
GET    /admin/requests           # List (page, limit, status, urgencyLevel, bloodGroup, district, search, sortBy, sortOrder)
GET    /admin/requests/:id      # Get by ID
PUT    /admin/requests/:id      # Update { status, verified, verifiedBy, donorId, patientName, bloodGroup, district, units, urgencyLevel }
PUT    /admin/requests/:id/status # Update status only { status: "pending"|"matched"|"accepted"|"fulfilled"|"completed"|"cancelled"|"expired" }
DELETE /admin/requests/:id      # Delete
```

---

## 🔗 Matches
```
GET /admin/matches      # List (page, limit, status, bloodGroup, district, sortBy, sortOrder)
GET /admin/matches/:id  # Get by ID (request ID)
```

---

## 💉 Donations
```
GET /admin/donations    # List fulfilled (page, limit, bloodGroup, district, sortBy, sortOrder)
```

---

## 🚨 Emergencies
```
GET /admin/emergencies  # List critical requests (page, limit)
```

---

## 📊 Statistics (Chart-Ready)
```
GET /admin/stats/overview         # Overview stats
GET /admin/stats/donors           # Pie: Available vs Unavailable
GET /admin/stats/requests         # Bar: Status breakdown
GET /admin/stats/blood-types      # Bar: Demand vs Supply
GET /admin/stats/locations        # Bar: Requests per district
GET /admin/stats/donations-trend  # Line: Monthly donations
```

---

## 🔔 Notifications & Activity
```
GET /admin/notifications  # List (page, limit, userId, read, type, sortBy, sortOrder)
GET /admin/activity-logs  # List (page, limit, type, sortBy, sortOrder)
```

---

## 📦 Common Query Parameters

### Pagination
- `page` (default: 1)
- `limit` (default: 50)

### Sorting
- `sortBy` - Field name
- `sortOrder` - "asc" or "desc" (default: "desc")

### Filtering
- `search` - Text search
- `status` - Filter by status
- `role` - Filter by role
- `bloodGroup` - Filter by blood group
- `district` - Filter by district
- `urgencyLevel` - Filter by urgency
- `availability` - Filter by availability
- `read` - Filter by read status (notifications)
- `type` - Filter by type
- `userId` - Filter by user ID

---

## 📄 Response Format

### List Response
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

### Chart Response
```json
{
  "chart": {
    "type": "pie|bar|line",
    "data": [
      { "label": "...", "value": 10 }
    ]
  }
}
```

---

## 🎯 Dashboard Menu → Endpoint Mapping

| Menu Item | Primary Endpoint |
|-----------|------------------|
| Dashboard | `GET /admin/dashboard/stats` |
| Users | `GET /admin/users` |
| Donors | `GET /admin/donors` |
| Requests | `GET /admin/requests` |
| Matches | `GET /admin/matches` |
| Donations | `GET /admin/donations` |
| Emergencies | `GET /admin/emergencies` |
| Statistics | `GET /admin/stats/*` |
| Notifications | `GET /admin/notifications` |
| Activity Logs | `GET /admin/activity-logs` |

---

## ✅ All 28 Endpoints Ready!

**Base URL**: `http://localhost:5000` (or your backend URL)
**All endpoints**: `/admin/*`

**Status**: ✅ Production Ready
