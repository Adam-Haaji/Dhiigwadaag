# Port 5000 Setup Guide

## Problem
Port 5000 is already in use by another process.

## Solution

### Option 1: Kill the Process Using Port 5000 (Recommended)

**Windows PowerShell:**
```powershell
# Run the helper script
npm run kill-port

# Or manually:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Quick Command:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

### Option 2: Use a Different Port

Create a `.env` file in the `backend` folder:
```
PORT=5001
BACKEND_PORT=5001
```

Then update:
- `frontend/config/api.ts` - Change port to 5001
- `admin/src/lib/api.ts` - Change port to 5001

## All Apps Configuration

### Backend (Port 5000)
- Default port: `5000`
- Config: `backend/server.js`
- Environment variable: `PORT` or `BACKEND_PORT`

### Frontend (React Native/Expo)
- API URL: `http://127.0.0.1:5000` (default)
- Config: `frontend/config/api.ts`
- Environment variable: `EXPO_PUBLIC_API_BASE_URL`

### Admin Dashboard
- API URL: `http://localhost:5000/api` (default)
- Config: `admin/src/lib/api.ts`
- Environment variable: `VITE_API_BASE_URL`

## Testing Port Availability

```powershell
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Check what process is using it
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess
```

## Quick Fix Script

The project includes a PowerShell script at `backend/scripts/kill-port-5000.ps1` that automatically finds and kills processes using port 5000.

Run it with:
```powershell
npm run kill-port
```

Or directly:
```powershell
powershell -ExecutionPolicy Bypass -File backend/scripts/kill-port-5000.ps1
```
