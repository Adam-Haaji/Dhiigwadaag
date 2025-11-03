# AI Blood Donation Backend

## Setup
1) Environment

Create a `.env` in `backend/` (already included). Recommended values:
```
PORT=5000
MONGO_URI=your_mongodb_atlas_url
JWT_SECRET=your_secret_key

# Optional legacy Flask service (kept for backward compatibility)
FLASK_API_URL=http://localhost:5001

# New FastAPI model service
AI_MODEL_API_URL=http://127.0.0.1:8000
AI_MATCH_ALERT_THRESHOLD=0.85

# Optional SMS delivery (Twilio) for emergency alerts
# If provided, the backend will attempt to send an SMS to alerted donors' phone numbers
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM=+1234567890
# Optional: prepend if your stored phone numbers are not E.164
# e.g., +252 for Somalia, +1 for USA
TWILIO_DEFAULT_COUNTRY_CODE=
```

2) Install deps and run
- Install: npm install
- Dev (with auto-reload): npm run dev
- Prod: npm start

3) Health check
- Open http://localhost:5000/api/health to verify the server is up

## API
- Auth: POST /api/auth/signup, POST /api/auth/login
- Users: GET /api/users/me, PUT /api/users/me, GET /api/users/donors
- Requests:
	- POST /api/requests (auth) — create request
	- GET /api/requests — list all requests
	- GET /api/requests/:id (auth) — get one request
	- PUT /api/requests/:id/respond — log donor response { donorId, method: 'call'|'whatsapp'|'donate' }
	- PUT /api/requests/:id/mark-fulfilled (auth) — mark as Fulfilled; sets fulfilledAt
		- PUT /api/requests/:id/cancel (auth) — mark as Cancelled; sets cancelledAt
	- DELETE /api/requests/:id — delete request
		- POST /api/requests/match (auth) — AI match (Flask)
	- POST /api/requests/emergency (auth) — broadcast emergency
  
	- AI routes:
		- GET /api/ai/health — checks connectivity to Python (legacy Flask) if configured
		- POST /api/ai/predict-match (auth) — legacy Flask proxy
		- POST /api/ai/emergency-alert (auth) — legacy Flask proxy
		- POST /api/ai/match (auth) — FastAPI proxy returns `{ success, score, alerted }`
		  - If `score >= AI_MATCH_ALERT_THRESHOLD`, the server creates Notification docs for up to 3 donors and, if Twilio env vars are set, attempts to send an SMS to each alerted donor.
- Donations: POST /api/donations
- Notifications: GET /api/notifications, POST /api/notifications/mark-all-read
	- Push registration: POST /api/notifications/register-token { token } (auth)

## Notes
- Ensure your MongoDB Atlas IP access list allows your current IP.
- If using the legacy Flask AI API, start it on the port specified by FLASK_API_URL (e.g., 5001).
- For the new model API, set `AI_MODEL_API_URL` (default http://127.0.0.1:8000) and start the service:
	- See `backend/ai-service/README.md` for training and running instructions.
- Swagger docs are in `swagger.json` (no comments allowed inside JSON).

### Push notifications
- Mobile app requests permission and registers an Expo push token with `POST /api/notifications/register-token`.
- Server attempts to send push for emergency alerts using Expo Push service and optionally SMS via Twilio if configured.
- To enable reliable token generation during development, set `extra.eas.projectId` in `frontend/app.json` to your EAS project ID or set `EXPO_PUBLIC_EAS_PROJECT_ID` in your environment.
 
### Fulfilled flow
- Donor responds (respond endpoint) → status becomes Contacted/Matched.
- Requester/Admin calls mark-fulfilled → status becomes Fulfilled and fulfilledAt recorded.
- Further donor responses are blocked once Fulfilled.