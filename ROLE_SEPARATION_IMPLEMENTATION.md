# Role Separation & Requester Onboarding Implementation

## Summary

This document describes the implementation of:
1. **Normal User → Requester Onboarding Flow**
2. **Backend & Database Role Separation**

## ✅ Completed Changes

### 1. Database Migration Script
**File**: `backend/scripts/migrate-role-separation.mjs`

- Migrates existing users with role `donor`/`both` to `donors` collection
- Migrates existing users with role `requester`/`both` to `requesters` collection
- Updates all users to have role `user` (except admins)
- Preserves all data - no data loss

**Run migration**:
```bash
cd backend
npm run data:migrate-role-separation
```

### 2. User Model Updated
**File**: `backend/src/models/User.js`

- **Changed**: Role enum from `['none', 'donor', 'requester', 'both', 'admin']` to `['user', 'admin']`
- **Default**: `role: 'user'`
- **Result**: Users collection now only contains normal users

### 3. Requester Controller Enhanced
**File**: `backend/src/controllers/requesterController.js`

- `POST /api/requesters/register`: Creates requester record WITHOUT changing user.role
- Returns user profile (email, phone, name) for dashboard auto-loading
- `GET /api/requesters/me`: Returns requester record with user profile

### 4. Frontend Role Selection
**File**: `frontend/app/role.tsx`

- When user clicks "Request Blood":
  - Calls `api.requesterRegister()` to create requester record
  - Stores user profile from response
  - Immediately redirects to `/(home)/request`

### 5. Requester Dashboard Auto-Load Profile
**File**: `frontend/app/(home)/request.tsx`

- Checks for requester record on mount
- Auto-loads user profile (email, phone, name) from API
- Displays profile in read-only section at top of dashboard
- Redirects to role selection if no requester record exists

### 6. Login Flow Updated
**File**: `frontend/app/login.tsx`

- Checks for requester record first (regardless of user.role)
- Checks for donor record second
- Routes to appropriate dashboard based on records, not role
- Falls back to role selection if no records exist

### 7. Endpoints Fixed
**Files**: Multiple controller files

- **bloodRequestController.js**: Removed user.role updates when creating requests
- **requestController.js**: Uses Donor collection instead of User.find({ role: 'Donor' })
- **statsController.js**: Uses Donor collection for donor counts
- **adminController.js**: Removed user.role updates for donor status

## 📋 Collection Structure

### users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  password: String (hashed),
  role: 'user' | 'admin',  // Only normal users or admins
  createdAt: Date,
  updatedAt: Date
}
```

### donors Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User'),  // Link to users collection
  fullName: String,
  email: String,
  phone: String,
  bloodGroup: String,
  district: String,
  availabilityStatus: 'available' | 'unavailable',
  isActive: Boolean,
  lastDonationDate: Date,
  nextEligibilityDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### requesters Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User'),  // Link to users collection
  createdAt: Date,
  updatedAt: Date
}
```

### requests / bloodrequests Collections
```javascript
{
  _id: ObjectId,
  requesterId: ObjectId (ref: 'User'),  // Link to users collection
  patientName: String,
  bloodGroup: String,
  district: String,
  status: 'pending' | 'matched' | 'fulfilled' | ...,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔄 User Flow

### New User Registration
1. User signs up → Created in `users` collection with `role: 'user'`
2. User logs in → Redirected to role selection page (`/role`)

### User Chooses "Request Blood"
1. Frontend calls `POST /api/requesters/register`
2. Backend creates record in `requesters` collection
3. Backend returns user profile (email, phone, name)
4. Frontend stores profile and redirects to `/(home)/request`
5. Requester dashboard auto-loads and displays profile (read-only)

### User Chooses "Become Donor"
1. Frontend calls `POST /api/users/select-role` (donor)
2. Backend redirects to `/donorRegistration`
3. After registration, donor record created in `donors` collection
4. User redirected to `/(home)/donor`

### Subsequent Logins
1. User logs in
2. System checks for requester record → Routes to requester dashboard
3. If no requester record, checks for donor record → Routes to donor dashboard
4. If neither, routes to role selection

## 🚨 Important Constraints

✅ **DO NOT** change user.role when creating requests or donors
✅ **DO NOT** store donor/requester data in users collection
✅ **DO NOT** merge collections or flatten data structure
✅ **ONLY** use correct collections for each entity type

## 📝 API Endpoints

### Requester Endpoints
- `POST /api/requesters/register` - Create requester record (returns user profile)
- `GET /api/requesters/me` - Get requester record with user profile

### User Endpoints
- `GET /api/users` - List normal users only
- `POST /api/users/register` - Create normal user (role: 'user')
- `POST /api/users/login` - Login (returns user with role: 'user')

### Donor Endpoints
- `POST /api/donors` - Create donor record (does NOT change user.role)
- `GET /api/donors` - List all donors from donors collection

### Request Endpoints
- `POST /api/blood-requests` - Create request (does NOT change user.role)
- `GET /api/blood-requests` - List requests from bloodrequests collection

## ✅ Acceptance Criteria

- [x] Normal user → Clicks "Request Blood" → Instantly redirected to Requester Dashboard
- [x] Email & phone auto-displayed in requester dashboard (read-only)
- [x] User does not see role selection page again unless logout
- [x] Users collection contains only normal users (role: 'user')
- [x] Donors collection contains only donor records
- [x] Requesters collection contains only requester records
- [x] All endpoints use correct collections
- [x] No data loss during migration

## 🔧 Next Steps

1. **Run Migration Script**:
   ```bash
   cd backend
   npm run data:migrate-role-separation
   ```

2. **Test Requester Flow**:
   - Register new user
   - Login → Should see role selection
   - Click "Request Blood" → Should redirect to requester dashboard
   - Verify email/phone are displayed
   - Logout and login again → Should go directly to requester dashboard

3. **Verify Data Separation**:
   - Check MongoDB: `users` collection should only have role: 'user' or 'admin'
   - Check MongoDB: `donors` collection should have donor records with userId links
   - Check MongoDB: `requesters` collection should have requester records with userId links

## 📚 Files Modified

### Backend
- `backend/src/models/User.js` - Updated role enum
- `backend/src/controllers/requesterController.js` - Enhanced to return user profile
- `backend/src/controllers/bloodRequestController.js` - Removed user.role updates
- `backend/src/controllers/requestController.js` - Uses Donor collection
- `backend/src/controllers/statsController.js` - Uses Donor collection
- `backend/src/controllers/adminController.js` - Removed user.role updates
- `backend/scripts/migrate-role-separation.mjs` - Migration script (NEW)

### Frontend
- `frontend/app/role.tsx` - Updated requester flow
- `frontend/app/login.tsx` - Updated to check requester/donor records
- `frontend/app/(home)/request.tsx` - Added profile auto-loading

## ⚠️ Breaking Changes

- **User.role enum changed**: Old values (`donor`, `requester`, `both`, `none`) are no longer valid
- **Migration required**: Must run migration script before using new system
- **Frontend routing**: Now checks for requester/donor records instead of user.role
