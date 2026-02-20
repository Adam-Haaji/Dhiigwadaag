# User Onboarding Flow Implementation

## Overview
This document describes the complete onboarding flow implementation for new users, including role selection, role persistence, and role-based routing.

## Implementation Summary

### Backend Changes

#### 1. Enhanced Login Response (`backend/src/controllers/authController.js`)
- Added `needsRoleSelection` flag: `true` if user role is 'none'
- Added `needsDonorRegistration` flag: `true` if user is donor but has no Donor record
- Login response now includes onboarding status flags

#### 2. Role Selection Endpoint (`backend/src/controllers/userController.js`)
- Updated `switchRole` endpoint to:
  - Only allow 'donor' or 'requester' (removed 'both' from onboarding)
  - Prevent role changes after initial selection (role is permanent)
  - Return `needsDonorRegistration` flag for donors
  - Atomically update user role in database

#### 3. Onboarding Middleware (`backend/src/middleware/onboardingMiddleware.js`)
- `requireRoleSelection`: Ensures user has selected a role
- `requireDonorRegistration`: Ensures donor has completed registration
- `requireOnboardingComplete`: Combined check for both

#### 4. Donor Routes Protection (`backend/src/routes/donors.js`)
- Added `requireRoleSelection` middleware to donor registration endpoints
- Added `GET /api/donors/me` endpoint to check donor registration status

#### 5. Donor Controller (`backend/src/controllers/donorController.js`)
- Added `getMyDonorProfile`: Returns current user's donor profile or registration status

### Frontend Changes

#### 1. Login Flow (`frontend/app/login.tsx`)
- Updated to check onboarding flags from login response
- Routing logic:
  - `needsRoleSelection` → `/role`
  - `needsDonorRegistration` → `/donorRegistration`
  - `role === 'donor'` → `/(home)/donor`
  - `role === 'requester'` → `/(home)/request`

#### 2. Role Selection Page (`frontend/app/role.tsx`)
- Updated `doSwitch` function to:
  - Handle role selection atomically
  - Check `needsDonorRegistration` flag
  - Route donors to registration if needed
  - Route requesters directly to dashboard
  - Show error alerts on failure

#### 3. Donor Registration (`frontend/app/donorRegistration.tsx`)
- Updated success handler to:
  - Update user state with registration completion flags
  - Redirect to donor dashboard after successful registration
  - Clear onboarding flags

#### 4. Donor Dashboard (`frontend/app/(home)/donor.tsx`)
- Added onboarding checks:
  - Redirects to `/role` if role is not donor
  - Redirects to `/donorRegistration` if registration incomplete
  - Checks backend for donor record existence
  - Updates user state with onboarding flags

#### 5. Requester Dashboard (`frontend/app/(home)/request.tsx`)
- Added role check:
  - Redirects to `/role` if role is not requester

#### 6. API Client (`frontend/service/api.ts`)
- Updated `switchRole` to only accept 'donor' or 'requester'
- Added `getMyDonorProfile` method

## User Flow Diagrams

### New User (First Login)
```
Signup → Login → Role Selection → [Donor Path | Requester Path]
```

### Donor Path
```
Role Selection (Donor) → Donor Registration → Donor Dashboard
```

### Requester Path
```
Role Selection (Requester) → Requester Dashboard
```

### Returning User
```
Login → [Check Role] → [Check Donor Registration if Donor] → Appropriate Dashboard
```

## Key Features

### 1. Role Selection
- **When**: First login (role = 'none')
- **Options**: Only "Donor" or "Requester"
- **Persistence**: Role is permanently stored in database
- **No Manual Switching**: Once selected, role cannot be changed via UI

### 2. Donor Flow
- **Role Selection**: User selects "Donor" → role updated to 'donor'
- **Registration Required**: Must complete donor registration before dashboard access
- **Registration Form**: Pre-filled with user profile data where applicable
- **Dashboard Access**: Only after successful registration

### 3. Requester Flow
- **Role Selection**: User selects "Requester" → role updated to 'requester'
- **No Registration**: Direct access to requester dashboard
- **Immediate Access**: Can create blood requests immediately

### 4. Access Control
- **Protected Routes**: Dashboards check role before rendering
- **Middleware Protection**: Backend endpoints protected with role checks
- **Automatic Redirects**: Users redirected to appropriate onboarding step if incomplete

## API Endpoints

### Authentication
- `POST /api/auth/login` - Returns onboarding flags
- `POST /api/auth/signup` - Creates user with role='none'

### Role Management
- `POST /api/users/switch-role` - Atomically updates role (donor/requester only)

### Donor Management
- `GET /api/donors/me` - Check donor registration status
- `POST /api/donors/register` - Lightweight eligibility registration
- `POST /api/donors` - Full donor profile creation

## Database Schema

### User Model
```javascript
{
  role: 'none' | 'donor' | 'requester' | 'both' | 'admin', // default: 'none'
  // ... other fields
}
```

### Donor Model
```javascript
{
  user: ObjectId, // Reference to User
  // ... donor-specific fields
}
```

## Security & Validation

1. **Atomic Updates**: Role changes are atomic database operations
2. **Role Validation**: Backend validates role before allowing changes
3. **Registration Checks**: Backend verifies donor registration before dashboard access
4. **JWT Tokens**: Include role in token for authorization
5. **Middleware Protection**: All protected routes use middleware

## Error Handling

- **Role Already Set**: Returns 400 error if trying to change role after selection
- **Invalid Role**: Returns 400 error for invalid role values
- **Missing Registration**: Returns 403 error with redirect instruction
- **Network Errors**: Frontend shows user-friendly error messages

## Testing Checklist

- [ ] New user signup creates user with role='none'
- [ ] First login redirects to role selection
- [ ] Role selection updates database atomically
- [ ] Donor selection redirects to registration
- [ ] Donor registration creates Donor record
- [ ] Donor dashboard blocks access until registration complete
- [ ] Requester selection redirects directly to dashboard
- [ ] Returning users skip role selection
- [ ] Role cannot be changed after initial selection
- [ ] Protected routes enforce role-based access

## Future Enhancements

1. **Full Donor Profile**: Update registration to use full `createDonor` endpoint with all fields
2. **Profile Completion**: Add profile completion percentage indicator
3. **Onboarding Progress**: Show onboarding progress bar
4. **Role Switching**: Allow admin to change user roles (separate from user onboarding)
5. **Email Verification**: Add email verification step before role selection

## Notes

- The current implementation uses `registerDonorEligibility` which updates the User model but may not create a full Donor record. Consider updating to use `createDonor` for complete donor profile creation.
- Role selection is permanent for regular users. Only admins should be able to change roles after initial selection.
- All onboarding checks happen both on frontend (for UX) and backend (for security).
