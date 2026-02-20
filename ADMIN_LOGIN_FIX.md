# Admin Login Fix

## Issues Fixed

1. **Route Mounting Issue**: 
   - **Problem**: Admin routes were mounted at `/admin` but frontend expected `/api/admin`
   - **Fix**: Changed backend route mounting from `app.use('/admin', adminRoutes)` to `app.use('/api/admin', adminRoutes)`
   - **Result**: Admin login endpoint is now at `POST http://localhost:5000/api/admin/auth/login`

2. **Admin User Setup**:
   - **Email**: `adan@gmail.com`
   - **Password**: `12345`
   - **Role**: `admin`
   - **Status**: ✅ Confirmed in database

3. **Error Logging**:
   - Added comprehensive logging to help debug login issues
   - Logs include: email attempts, user lookup, role checks, password validation, and JWT token generation

## Testing the Admin Login

### Using curl:
```bash
curl -X POST http://localhost:5000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"adan@gmail.com","password":"12345"}'
```

### Expected Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Admin User",
    "email": "adan@gmail.com",
    "role": "admin"
  }
}
```

## Troubleshooting

If login still fails, check:

1. **Backend Server Running**: Ensure backend is running on port 5000
   ```bash
   cd backend
   npm run dev
   ```

2. **JWT_SECRET**: Verify `JWT_SECRET` is set in `backend/.env`
   ```
   JWT_SECRET=your_secret_key_here
   ```

3. **Database Connection**: Verify MongoDB connection is working
   - Check `MONGO_URI` in `backend/.env`
   - Check backend logs for connection errors

4. **Admin User Exists**: Run setup script to verify/update admin user
   ```bash
   cd backend
   npm run admin:setup
   ```

5. **Check Backend Logs**: Look for `[Admin Login]` messages in the console
   - Should show: email attempt, user found, role check, password validation, success

6. **CORS Issues**: Backend has CORS enabled for all origins (`origin: '*'`), so this shouldn't be an issue

7. **Frontend API Base URL**: Verify admin frontend is using correct base URL
   - Should be: `http://localhost:5000/api` (in `admin/src/lib/api.ts`)

## Admin Login Endpoint Details

- **URL**: `POST /api/admin/auth/login`
- **Auth Required**: No (public endpoint)
- **Request Body**:
  ```json
  {
    "email": "adan@gmail.com",
    "password": "12345"
  }
  ```
- **Success Response** (200):
  ```json
  {
    "token": "JWT_TOKEN_HERE",
    "user": {
      "id": "USER_ID",
      "name": "Admin User",
      "email": "adan@gmail.com",
      "role": "admin"
    }
  }
  ```
- **Error Responses**:
  - `400`: Invalid credentials or missing email/password
  - `403`: User exists but is not an admin
  - `500`: Server error (check logs)

## Next Steps

1. Restart the backend server to apply route changes
2. Try logging in from the admin frontend
3. Check backend console logs for `[Admin Login]` messages
4. If issues persist, check browser console for network errors
