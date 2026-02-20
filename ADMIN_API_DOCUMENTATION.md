# Admin Backend API Documentation

## Overview
Complete Admin backend endpoints for the AI Blood Donation Matching & Emergency Alert System. All endpoints read from the existing MongoDB database shared with the main application.

## Authentication & Authorization

All `/admin/*` endpoints require:
- **JWT Authentication**: Valid JWT token in `Authorization: Bearer <token>` header
- **Admin Role**: User must have `role: "admin"` in the User model

**Middleware**: All routes are protected by `authMiddleware` and `requireAdmin` middleware.

---

## 📊 Dashboard Statistics

### GET /admin/dashboard/stats
**Description**: Overview statistics for admin dashboard

**Response**:
```json
{
  "users": {
    "total": 150,
    "donors": 80,
    "available": 45,
    "unavailable": 35
  },
  "requests": {
    "pending": 12,
    "matched": 8,
    "fulfilled": 25,
    "expired": 3,
    "critical": 5,
    "normal": 15
  },
  "donations": {
    "total": 25
  },
  "notifications": {
    "total": 200
  }
}
```

---

## 👤 User Management

### GET /admin/users
**Description**: List all users with pagination, filtering, and sorting

**Query Parameters**:
- `page` (default: 1) - Page number
- `limit` (default: 50) - Items per page
- `role` - Filter by role (donor, requester, none, both)
- `search` - Search in name, email, phone
- `status` - Filter by status (active, blocked, inactive)
- `sortBy` - Sort field (name, email, role, createdAt, updatedAt)
- `sortOrder` - Sort order (asc, desc)

**Response**:
```json
{
  "users": [...],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

### GET /admin/users/:id
**Description**: Get user by ID

**Response**:
```json
{
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "donor",
    "status": "active",
    "createdAt": "..."
  }
}
```

### POST /admin/users
**Description**: Create new user

**Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "none"
}
```

### PUT /admin/users/:id
**Description**: Update user information

**Body** (all fields optional):
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "donor",
  "phone": "1234567890",
  "bloodType": "A+",
  "location": "Hodan"
}
```

### PATCH /admin/users/:id/status
**Description**: Update user status (active/blocked/inactive)

**Body**:
```json
{
  "status": "active" // or "blocked" or "inactive"
}
```

### DELETE /admin/users/:id
**Description**: Delete user (also deletes associated donor record)

**Response**:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 🩸 Donor Management

### GET /admin/donors
**Description**: List all donors with pagination, filtering, and sorting

**Query Parameters**:
- `page`, `limit` - Pagination
- `availability` - Filter by availability (available, unavailable)
- `bloodGroup` - Filter by blood group
- `district` - Filter by district
- `search` - Search in name, email, phone
- `sortBy` - Sort field (fullName, email, bloodGroup, district, availabilityStatus, lastDonationDate, createdAt)
- `sortOrder` - Sort order (asc, desc)

**Response**:
```json
{
  "donors": [
    {
      "_id": "...",
      "fullName": "John Doe",
      "bloodGroup": "A+",
      "district": "Hodan",
      "availabilityStatus": "available",
      "lastDonationDate": "2024-01-15",
      "nextEligibilityDate": "2024-04-15",
      "daysUntilEligible": 0,
      "user": { "name": "...", "email": "..." }
    }
  ],
  "total": 80,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

### GET /admin/donors/:id
**Description**: Get donor by ID with computed eligibility dates

**Response**: Same format as donor in list, with full details

### PUT /admin/donors/:id
**Description**: Update donor information

**Body** (all fields optional):
```json
{
  "fullName": "John Doe",
  "phone": "1234567890",
  "email": "john@example.com",
  "district": "Hodan",
  "bloodGroup": "A+",
  "weightKg": 70,
  "availabilityStatus": "available",
  "isActive": true
}
```

### PATCH /admin/donors/:id/availability
**Description**: Update donor availability status

**Body**:
```json
{
  "availabilityStatus": "available" // or "unavailable"
}
```

**Note**: If setting to unavailable, donor is marked inactive. If setting to available, checks cooldown period.

### DELETE /admin/donors/:id
**Description**: Delete donor (updates linked user role)

---

## 📝 Request Management

### GET /admin/requests
**Description**: List all blood requests with pagination, filtering, and sorting

**Query Parameters**:
- `page`, `limit` - Pagination
- `status` - Filter by status (pending, matched, accepted, fulfilled, completed, cancelled, expired)
- `urgencyLevel` - Filter by urgency (critical, normal)
- `bloodGroup` - Filter by blood group
- `district` - Filter by district
- `search` - Search in patientName, contactPerson, contactPhone
- `sortBy` - Sort field (patientName, bloodGroup, district, status, urgencyLevel, createdAt, matchedAt, fulfilledAt)
- `sortOrder` - Sort order (asc, desc)

**Response**:
```json
{
  "requests": [
    {
      "_id": "...",
      "patientName": "Jane Smith",
      "bloodGroup": "O+",
      "district": "Hodan",
      "units": 2,
      "urgencyLevel": "critical",
      "status": "matched",
      "requesterId": { "name": "...", "email": "..." },
      "donorId": { "fullName": "...", "phone": "..." },
      "matchedAt": "2024-01-20T10:00:00Z",
      "createdAt": "2024-01-20T09:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

### GET /admin/requests/:id
**Description**: Get request by ID with full details

### PUT /admin/requests/:id
**Description**: Update request information

**Body** (all fields optional):
```json
{
  "status": "fulfilled",
  "verified": true,
  "verifiedBy": "Admin Name",
  "donorId": "...",
  "patientName": "...",
  "bloodGroup": "O+",
  "district": "Hodan",
  "units": 2,
  "urgencyLevel": "critical"
}
```

### PUT /admin/requests/:id/status
**Description**: Update request status only

**Body**:
```json
{
  "status": "fulfilled" // pending, matched, accepted, fulfilled, completed, cancelled, expired
}
```

### DELETE /admin/requests/:id
**Description**: Delete request (clears donor's matchedRequest if applicable)

---

## 🔗 Match Management

### GET /admin/matches
**Description**: List all matches (requests with matched donors)

**Query Parameters**:
- `page`, `limit` - Pagination
- `status` - Filter by match status (matched, accepted, fulfilled)
- `bloodGroup` - Filter by blood group
- `district` - Filter by district
- `sortBy` - Sort field (matchedAt, createdAt, bloodGroup, district, status)
- `sortOrder` - Sort order (asc, desc)

**Response**:
```json
{
  "matches": [
    {
      "_id": "...",
      "requestId": "...",
      "donor": {
        "_id": "...",
        "name": "John Doe",
        "phone": "1234567890",
        "email": "john@example.com",
        "bloodGroup": "O+",
        "district": "Hodan",
        "availabilityStatus": "available"
      },
      "requester": {
        "_id": "...",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "0987654321"
      },
      "bloodType": "O+",
      "location": "Hodan",
      "status": "matched",
      "donorAccepted": false,
      "donorDeclined": false,
      "matchedAt": "2024-01-20T10:00:00Z",
      "createdAt": "2024-01-20T09:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

### GET /admin/matches/:id
**Description**: Get match by ID (request ID) with full details

---

## 💉 Donation Management

### GET /admin/donations
**Description**: List all fulfilled donations

**Query Parameters**:
- `page`, `limit` - Pagination
- `bloodGroup` - Filter by blood group
- `district` - Filter by district
- `sortBy` - Sort field (fulfilledAt, createdAt, bloodGroup, district)
- `sortOrder` - Sort order (asc, desc)

**Response**:
```json
{
  "donations": [
    {
      "_id": "...",
      "requestId": "...",
      "donor": {
        "_id": "...",
        "name": "John Doe",
        "phone": "1234567890",
        "email": "john@example.com",
        "bloodGroup": "O+",
        "district": "Hodan"
      },
      "requester": {
        "_id": "...",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "0987654321"
      },
      "donationDate": "2024-01-20T12:00:00Z",
      "bloodType": "O+",
      "location": "Hodan",
      "units": 2,
      "patientName": "Patient Name",
      "verified": true,
      "verifiedBy": "Admin Name",
      "verifiedDate": "2024-01-20T13:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

---

## 🚨 Emergency Management

### GET /admin/emergencies
**Description**: List all critical/emergency requests

**Query Parameters**:
- `page`, `limit` - Pagination

**Response**: Same format as requests, filtered to `urgencyLevel: 'critical'` and `status: ['pending', 'matched']`

---

## 📊 Statistics Endpoints (Chart-Ready)

### GET /admin/stats/overview
**Description**: Overview statistics for dashboard

**Response**:
```json
{
  "users": { "total": 150 },
  "donors": { "total": 80, "active": 45 },
  "requests": { "total": 50, "pending": 12, "fulfilled": 25 },
  "donations": { "total": 25 }
}
```

### GET /admin/stats/donors
**Description**: Donor availability statistics (Pie chart data)

**Response**:
```json
{
  "chart": {
    "type": "pie",
    "data": [
      { "label": "Available", "value": 45 },
      { "label": "Unavailable", "value": 35 }
    ]
  }
}
```

### GET /admin/stats/requests
**Description**: Request status statistics (Bar chart data)

**Response**:
```json
{
  "chart": {
    "type": "bar",
    "data": [
      { "label": "Pending", "value": 12 },
      { "label": "Matched", "value": 8 },
      { "label": "Accepted", "value": 5 },
      { "label": "Fulfilled", "value": 20 },
      { "label": "Completed", "value": 5 },
      { "label": "Expired", "value": 3 },
      { "label": "Cancelled", "value": 2 }
    ]
  }
}
```

### GET /admin/stats/blood-types
**Description**: Blood type demand vs supply (Bar chart data)

**Response**:
```json
{
  "chart": {
    "type": "bar",
    "data": [
      {
        "bloodType": "A+",
        "demand": 15,
        "supply": 12
      },
      {
        "bloodType": "O+",
        "demand": 20,
        "supply": 18
      }
      // ... all blood types
    ]
  }
}
```

### GET /admin/stats/locations
**Description**: Requests per district (Bar chart data)

**Response**:
```json
{
  "chart": {
    "type": "bar",
    "data": [
      { "label": "Hodan", "value": 15 },
      { "label": "Wadajir", "value": 12 },
      { "label": "Dayniile", "value": 8 }
      // ... all districts
    ]
  }
}
```

### GET /admin/stats/donations-trend
**Description**: Monthly donations trend (Line chart data)

**Response**:
```json
{
  "chart": {
    "type": "line",
    "data": [
      { "month": "2024-01", "donations": 5 },
      { "month": "2024-02", "donations": 8 },
      { "month": "2024-03", "donations": 12 }
    ]
  }
}
```

---

## 🔔 Notifications & Activity

### GET /admin/notifications
**Description**: List all notifications

**Query Parameters**:
- `page`, `limit` - Pagination
- `userId` - Filter by user ID
- `read` - Filter by read status (true/false)
- `type` - Filter by type (request, emergency, system)
- `sortBy` - Sort field (createdAt, read, type, urgent)
- `sortOrder` - Sort order (asc, desc)

**Response**:
```json
{
  "notifications": [
    {
      "_id": "...",
      "userId": "...",
      "title": "Donor Matched",
      "message": "A donor has been found...",
      "type": "request",
      "read": false,
      "urgent": true,
      "meta": { "requestId": "...", "status": "matched" },
      "createdAt": "2024-01-20T10:00:00Z"
    }
  ],
  "total": 200,
  "page": 1,
  "limit": 50,
  "totalPages": 4
}
```

### GET /admin/activity-logs
**Description**: Activity logs derived from notifications and request status changes

**Query Parameters**:
- `page`, `limit` - Pagination
- `type` - Filter by activity type (match, donation, request)
- `sortBy` - Sort field (createdAt, timestamp)
- `sortOrder` - Sort order (asc, desc)

**Response**:
```json
{
  "logs": [
    {
      "_id": "...",
      "type": "match",
      "action": "Donor Matched",
      "description": "Donor matched for Patient Name (O+) in Hodan",
      "userId": "...",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "metadata": {
        "requestId": "...",
        "bloodGroup": "O+",
        "district": "Hodan",
        "status": "matched"
      },
      "timestamp": "2024-01-20T10:00:00Z",
      "read": false
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

---

## Data Sources

All endpoints read directly from existing MongoDB collections:

- **Users**: `users` collection
- **Donors**: `donors` collection
- **Requests**: `bloodrequests` collection (primary), `requests` collection (legacy)
- **Matches**: Derived from `bloodrequests` with `donorId` and `status: ['matched', 'accepted']`
- **Donations**: Derived from `bloodrequests` with `status: ['fulfilled', 'completed']`
- **Notifications**: `notifications` collection
- **Activity Logs**: Derived from `notifications` and `bloodrequests` status changes

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message"
}
```

**Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Not Found
- `500` - Internal Server Error

---

## Pagination

All list endpoints support pagination:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- Response includes: `total`, `page`, `limit`, `totalPages`

---

## Sorting

All list endpoints support sorting:
- `sortBy` - Field to sort by (varies by endpoint)
- `sortOrder` - `asc` or `desc` (default: `desc`)

---

## Filtering

Most list endpoints support filtering:
- Search: Text search across relevant fields
- Status: Filter by status/enum values
- Date ranges: Can be added via query parameters
- Relations: Filter by related entity IDs

---

## Notes

1. **No Separate Database**: All endpoints read from the same MongoDB database used by the main app
2. **Real-time Data**: All responses reflect current database state
3. **Chart-Ready**: Statistics endpoints return data formatted for common chart libraries (Recharts, Chart.js, etc.)
4. **Computed Fields**: Some endpoints include computed fields (e.g., `nextEligibilityDate`, `daysUntilEligible`)
5. **Atomic Operations**: All updates are atomic database operations
6. **Admin Protection**: All routes require admin role - non-admin users receive 403 Forbidden
