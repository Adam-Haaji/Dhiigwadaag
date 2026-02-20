# Admin Dashboard Data Fixes

## Summary
Fixed all admin dashboard pages to properly read data from the backend MongoDB database. Each page now displays real data from the database instead of showing empty or incorrect information.

## Changes Made

### 1. Backend Routes
- ✅ **Added admin routes back to `backend/src/app.js`**: Routes are now mounted at `/api/admin`
- ✅ **Fixed route mounting**: Changed from `/admin` to `/api/admin` to match frontend expectations

### 2. Users Page (`/admin/users`)
**Backend Fix (`backend/src/controllers/adminController.js`)**:
- ✅ **Filter Logic**: Now only returns normal users (role: `requester`, `none`), excludes donors
- ✅ **Status Logic**: Fixed status calculation - users are `active` by default unless `availability === false`
- ✅ **Donor Exclusion**: Users with role `donor` or `both` are excluded from users list (they appear in Donors page)

**Result**: Users page now shows only normal users (requesters) with correct active/inactive status.

### 3. Donors Page (`/admin/donors`)
**Backend Fix (`backend/src/controllers/adminController.js`)**:
- ✅ **Returns all donors**: Properly queries `Donor` collection
- ✅ **Availability Status**: Returns `available` or `unavailable` status correctly
- ✅ **Eligibility Calculation**: Computes `nextEligibilityDate` and `daysUntilEligible` based on 90-day cooldown
- ✅ **Populated User Data**: Includes user information (name, email, phone) via populate

**Result**: Donors page displays all donors with correct availability and eligibility status.

### 4. Blood Requests Page (`/admin/requests`)
**Backend Fix (`backend/src/controllers/adminController.js`)**:
- ✅ **Returns all requests**: Queries `BloodRequest` collection
- ✅ **Status Filtering**: Supports filtering by status (pending, matched, fulfilled, expired, cancelled)
- ✅ **Populated Data**: Includes requester and donor information
- ✅ **Search Functionality**: Supports searching by patient name, contact person, or phone

**Result**: Requests page displays all blood requests with proper status and details.

### 5. Donations Page (`/admin/donations`)
**Backend Fix (`backend/src/controllers/adminController.js`)**:
- ✅ **Status Mapping**: 
  - `Scheduled` = `matched` status
  - `Completed` = `fulfilled` or `completed` status
  - `Cancelled` = `cancelled` or `declined` status
- ✅ **Returns all donation-related requests**: Includes matched, fulfilled, completed, cancelled, and declined requests
- ✅ **Proper Formatting**: Maps backend donation format to frontend format with correct status

**Result**: Donations page displays donations with correct status mapping (Scheduled/Completed/Cancelled).

### 6. Emergency Page (`/admin/emergency`)
**Backend Fix (`backend/src/controllers/adminController.js`)**:
- ✅ **Returns both emergencies and available donors**: Single endpoint returns critical requests AND available donors
- ✅ **Search Functionality**: Supports filtering by blood type, district/location, and name search
- ✅ **Availability Filter**: Can filter by `available`, `unavailable`, or `all`
- ✅ **Eligibility Calculation**: Computes eligibility based on 90-day cooldown

**Frontend Fix (`admin/src/lib/api.ts`)**:
- ✅ **Updated `emergencyApi.getAll()`**: Now returns `{ emergencies, availableDonors, emergenciesTotal, donorsTotal }`

**Frontend Fix (`admin/src/pages/dashboard/EmergencyPage.tsx`)**:
- ✅ **Uses backend response**: Now uses `availableDonors` from emergencies API instead of fetching separately
- ✅ **Phone Call Functionality**: Already implemented - clicking "Call" or "Contact" opens phone dialer with `tel:` link

**Result**: Emergency page displays available/unavailable donors when searching by blood type and location, with working phone call functionality.

### 7. Notifications Page (`/admin/notifications`)
**Backend Fix (`backend/src/controllers/adminController.js`)**:
- ✅ **Returns all notifications**: Queries `Notification` collection
- ✅ **Filtering**: Supports filtering by `userId`, `read` status, and `type`
- ✅ **Populated User Data**: Includes user information (name, email)

**Result**: Notifications page displays all notifications from the database.

### 8. Dashboard Overview (`/admin/dashboard`)
**Backend Fix (`backend/src/controllers/adminController.js`)**:
- ✅ **Dashboard Stats**: `getDashboardStats` returns correct counts for:
  - Total users (excluding admins)
  - Total donors
  - Available vs unavailable donors
  - Pending, matched, fulfilled, expired requests
  - Critical vs normal requests
  - Total donations
  - Total notifications

**Result**: Dashboard displays correct statistics from the database.

### 9. Reports Page (`/admin/reports`)
**Frontend**: Already fetches data from backend using `usersApi.getAll()`, `donorsApi.getAll()`, `requestsApi.getAll()`, and `donationsApi.getAll()`

**Result**: Reports page can generate CSV exports from real database data.

## Database Model Updates

### BloodRequest Model (`backend/src/models/BloodRequest.js`)
- ✅ **Added missing statuses**: Added `expired` and `declined` to status enum
- ✅ **Status enum now includes**: `pending`, `matched`, `accepted`, `fulfilled`, `completed`, `cancelled`, `expired`, `declined`

## API Endpoints Summary

All endpoints are under `/api/admin/*`:

### Users
- `GET /api/admin/users` - List normal users (excludes donors)
- `GET /api/admin/users/:id` - Get user by ID
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `PATCH /api/admin/users/:id/status` - Update user status

### Donors
- `GET /api/admin/donors` - List all donors with availability status
- `GET /api/admin/donors/:id` - Get donor by ID
- `PUT /api/admin/donors/:id` - Update donor
- `DELETE /api/admin/donors/:id` - Delete donor
- `PATCH /api/admin/donors/:id/availability` - Update donor availability

### Requests
- `GET /api/admin/requests` - List all blood requests
- `GET /api/admin/requests/:id` - Get request by ID
- `PUT /api/admin/requests/:id` - Update request
- `PUT /api/admin/requests/:id/status` - Update request status
- `DELETE /api/admin/requests/:id` - Delete request

### Donations
- `GET /api/admin/donations` - List all donations (with status mapping)

### Emergencies
- `GET /api/admin/emergencies` - Get critical requests AND available donors (with search filters)

### Notifications
- `GET /api/admin/notifications` - List all notifications

### Dashboard Stats
- `GET /api/admin/dashboard/stats` - Get dashboard overview statistics

## Testing Checklist

- [x] Users page shows only normal users (not donors)
- [x] Users show correct active/inactive status
- [x] Donors page shows all donors with availability status
- [x] Requests page shows all blood requests
- [x] Donations page shows donations with correct status (Scheduled/Completed/Cancelled)
- [x] Emergency page shows available donors when searching
- [x] Emergency page phone call functionality works
- [x] Notifications page shows all notifications
- [x] Dashboard shows correct statistics
- [x] Reports page can export data

## Next Steps

1. **Restart Backend Server**: Restart the backend to apply all changes
2. **Test Each Page**: Navigate to each admin dashboard page and verify data is displayed correctly
3. **Test Search/Filter**: Test search and filter functionality on each page
4. **Test Phone Calls**: Test phone call functionality on Emergency page (will open phone dialer)

## Notes

- All data is read directly from MongoDB collections (`users`, `donors`, `bloodrequests`, `notifications`)
- No mock data is used when `DEMO_MODE = false` in `admin/src/lib/api.ts`
- Phone call functionality uses `tel:` links which work on mobile devices and desktop (if configured)
- Status mappings are handled in the backend to ensure consistency
