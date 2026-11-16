# AI-Powered Blood Donation Matching and Emergency Alert System

A smart digital platform designed to connect blood donors with people in need of blood, improve donor coordination, and support faster responses to medical emergencies in Mogadishu, Somalia.

---

## 1. Project Overview

The **AI-Powered Blood Donation Matching and Emergency Alert System** is a mobile-based blood donation coordination platform developed to make finding suitable blood donors faster, easier, and more organized.

The project focuses on addressing the challenges people face when searching for blood donors, particularly during medical emergencies when time is critical. In many situations, patients and their families struggle to find available donors with compatible blood groups, leading to delays in receiving the blood they need.

This system provides a centralized platform where people can register as blood donors, submit blood requests, discover potential donors, and receive notifications about matching requests and emergencies.

Using blood group compatibility, donor availability, donation history, and location-based prioritization, the system identifies potential donors who may be suitable for a particular blood request.

The platform also includes an AI-assisted donor eligibility screening service, an intelligent chatbot, emergency alert functionality, and a web-based administrative dashboard.

The overall goal is to improve blood donation coordination, strengthen communication between donors and requesters, and support a more organized blood donation process.

> **Important Medical Notice:** This project is a research and software prototype. Its donor eligibility predictions and blood compatibility results are intended for decision support only. They do not replace professional medical screening, laboratory testing, crossmatching, or approval by qualified healthcare professionals.

---

## 2. Problem Statement

Access to suitable blood donors remains an important challenge, especially when patients require blood urgently.

Finding a compatible and available donor can be difficult when donor information is scattered across different communication channels, personal contacts, and informal networks.

Some of the major challenges include:

- Difficulty finding donors with compatible blood groups.
- Delays in identifying available blood donors during emergencies.
- Lack of centralized donor information.
- Difficulty tracking donor availability and donation history.
- Limited coordination between blood requesters and donors.
- Lack of organized communication and emergency notification systems.
- Challenges in identifying potential donors based on their location.

These challenges can increase the time and effort required to find suitable donors, particularly when immediate assistance is needed.

## 3. Proposed Solution

To address these challenges, the project introduces a centralized digital platform that connects blood donors with people who need blood.

The system allows users to register as donors, submit blood requests, search for potential donors, and receive notifications when relevant matches are identified.

The matching engine uses predefined blood group compatibility rules, donor availability, donation cooldown periods, and district-based prioritization to identify potential donors.

Additionally, an AI-assisted eligibility screening service evaluates donor information using predefined medical eligibility rules and an optional machine learning model.

The platform also provides emergency request management, in-app notifications, a chatbot for blood donation assistance, and an administrative dashboard for managing system activities.

By bringing these functionalities together, the system aims to make blood donation coordination more efficient, accessible, and organized.

---

## 4. Project Objectives

The main objectives of this project are:

- To develop a centralized platform for blood donation coordination.
- To connect blood donors with people who need blood.
- To reduce the time and effort required to identify potential donors.
- To identify potential donors using blood group compatibility and location.
- To monitor donor availability and donation history.
- To support donor eligibility screening through rule-based checks and machine learning.
- To provide emergency blood request and notification functionality.
- To improve communication between donors and blood requesters.
- To provide administrators with tools to manage and monitor platform activities.

---

## 5. Key Features

### 5.1 User Registration and Authentication

- User registration and login.
- Secure password hashing.
- JWT-based authentication.
- User profile management.
- Separate donor and requester capabilities.
- Support for users who have both donor and requester profiles.

### 5.2 Blood Donor Management

- Donor registration and profile management.
- Blood group selection.
- District and location information.
- Donor availability management.
- Donation history tracking.
- Donor eligibility status.
- Donation cooldown monitoring.
- Emergency contact information.

### 5.3 Intelligent Blood Donor Matching

The matching engine identifies potential donors based on:

- Blood group compatibility.
- Donor availability.
- Donation history.
- 90-day donation cooldown.
- District-based prioritization.
- Optional coordinate-based distance filtering.

The system prioritizes exact blood group matches in the same district before expanding the search to neighboring districts and other compatible blood groups.

**Note:** The matching engine uses predefined algorithmic rules rather than a trained machine learning matching model.

### 5.4 AI-Assisted Donor Eligibility Screening

The system includes a donor eligibility screening service that evaluates donor information.

Its functionality includes:

- Age eligibility checks.
- Minimum weight requirements.
- Hemoglobin level checks.
- Previous donation interval checks.
- Medical condition screening.
- Optional machine learning prediction.
- Eligibility prediction confidence.
- Eligibility decision logging.

The system combines predefined eligibility rules with an optional machine learning model to support the screening process.

Final donor suitability must always be confirmed by qualified medical professionals.

### 5.5 Emergency Blood Requests

- Creation of emergency blood requests.
- Urgency-based request management.
- Priority-based donor searching.
- Emergency donor notifications.
- Request status tracking.
- Automatic request expiration.
- Rematching when a donor declines or becomes unavailable.

### 5.6 Notification System

- In-app notifications.
- Blood request updates.
- Donor matching notifications.
- Emergency alerts.
- Notification history.
- Read and unread notification management.
- Optional Expo push notifications.
- Optional Twilio SMS integration.

External notification delivery depends on the required configuration and credentials.

### 5.7 AI-Assisted Chatbot

The application includes a chatbot designed to assist users with blood donation-related information.

Its functionality includes:

- Answering common blood donation questions.
- Providing blood compatibility guidance.
- Checking donor availability through application data.
- Handling selected questions through local intent recognition.
- Supporting optional OpenAI-powered responses.
- Supporting English and Somali interactions.

### 5.8 Administrative Dashboard

A separate web-based dashboard allows authorized administrators to monitor and manage the platform.

Main functionalities include:

- Dashboard statistics.
- User management.
- Blood donor management.
- Blood request management.
- Donation management.
- Emergency request monitoring.
- Matching information.
- Notification management.
- Charts and analytical summaries.
- Report generation and CSV exports.

---

## 6. Target Users

The platform is designed for the following user groups:

| User | Description |
|---|---|
| Blood Donors | People who register and volunteer to donate blood. |
| Blood Requesters | Patients' relatives, caregivers, or authorized representatives who submit blood requests. |
| Administrators | Authorized personnel responsible for managing users, donors, requests, donations, and system activities. |
| Healthcare Partners | Potential healthcare organizations and blood services that may support professional donor screening and transfusion verification. |

---

## 7. How the System Works

The platform follows a structured process to connect blood requesters with potential donors.

1. **User Registration:** Users create an account and sign in to the application.
2. **Profile Setup:** Users can register as blood donors, blood requesters, or both.
3. **Donor Registration:** Donors provide their blood group, location, personal information, donation history, and eligibility information.
4. **Eligibility Screening:** The system performs predefined eligibility checks and can request an additional machine learning prediction.
5. **Blood Request:** A requester submits a blood request by providing the required blood group, location, number of units, contact details, and urgency.
6. **Donor Matching:** The matching engine searches for available potential donors using blood compatibility and location-based prioritization.
7. **Notifications:** Relevant donors and requesters receive in-app notifications about matching results and request updates.
8. **Donor Response:** Potential donors can accept or decline matching requests.
9. **Donation Tracking:** Completed donations are recorded, and the donor's donation cooldown is updated.
10. **Administration:** Administrators monitor requests, donors, users, notifications, and other platform activities through the dashboard.

---

## 8. Technology Stack

The project uses the following technologies:

| Component | Technologies |
|---|---|
| Mobile Application | React Native, Expo, TypeScript |
| Mobile Navigation | Expo Router |
| Web Administration | React, TypeScript, Vite |
| UI Development | Tailwind CSS, shadcn/ui, Radix UI |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| Machine Learning | Python, scikit-learn, pandas |
| AI Service | FastAPI |
| AI Chatbot | OpenAI API |
| Push Notifications | Expo Notifications |
| SMS Integration | Twilio |
| Data Visualization | Recharts |
| Background Tasks | node-cron |

---

## 9. System Architecture

The project consists of four main application components:

1. **Mobile Application:** Provides the main interface for donors and blood requesters.
2. **Backend API:** Handles authentication, application logic, donor matching, requests, notifications, and database operations.
3. **Eligibility Prediction Service:** Provides an optional machine learning-based donor eligibility prediction through a separate FastAPI service.
4. **Administrative Dashboard:** Provides authorized administrators with tools to monitor and manage platform operations.

MongoDB is used as the central database for storing application information.

External services such as OpenAI, Expo Push Notifications, and Twilio can be integrated when properly configured.

---

## 10. Project Structure

The repository is organized into the following main directories:

```text
Blood-Donation/
│
├── admin/
│   └── React web-based administrative dashboard
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scheduler/
│   │   ├── services/
│   │   └── utils/
│   ├── scripts/
│   ├── tests/
│   └── server.js
│
├── eligibility_api/
│   ├── app.py
│   ├── eligibility_model.pkl
│   ├── scaler.pkl
│   ├── X_columns.pkl
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── service/
│   └── app.json
│
└── README.md
```

---

## 11. Database

The application uses MongoDB as its primary database.

The main database models and collections include:

| Collection | Purpose |
|---|---|
| User | Stores user accounts and authentication information. |
| Donor | Stores blood donor profiles, blood groups, availability, and eligibility information. |
| Requester | Stores requester capability information. |
| Request | Stores blood request information and request status. |
| BloodRequest | Stores the structured blood request workflow. |
| Donation | Stores donation history and related records. |
| Notification | Stores in-app notifications and alerts. |
| DonorEligibilityLog | Stores donor eligibility screening records. |

---

## 12. Prerequisites

Before running the project, make sure you have installed:

- Node.js 20 or later.
- npm.
- Python 3.10 or later.
- MongoDB Atlas account or another accessible MongoDB deployment.
- Expo Go or an appropriate Expo development build.
- Git.

Optional services:

- OpenAI API key for OpenAI-powered chatbot responses.
- Twilio account for SMS functionality.
- Expo configuration for push notifications.

---

## 13. Installation and Setup

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
```

Navigate into the project directory:

```bash
cd Blood-Donation
```

### Step 2: Configure the Backend

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create your environment configuration file:

```bash
cp .env.example .env
```

On Windows PowerShell, you can use:

```powershell
Copy-Item .env.example .env
```

Open the `.env` file and configure your environment variables.

### Step 3: Configure the Mobile Application

Open another terminal:

```bash
cd frontend
npm install
```

Configure the API base URL according to your local development environment.

### Step 4: Configure the Admin Dashboard

```bash
cd admin
npm install
```

If necessary, create an `.env.local` file and configure the backend API URL.

### Step 5: Configure the Eligibility API

Navigate to the eligibility service:

```bash
cd eligibility_api
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

---

## 14. Environment Variables

The backend requires environment variables for database connectivity, authentication, and optional AI functionality.

Create a `.env` file inside the `backend/` directory using `.env.example` as a template.

Example:

```env
BACKEND_PORT=5000

MONGO_URI=mongodb+srv://<username>:<url_encoded_password>@<cluster_host>/?retryWrites=true&w=majority&appName=<app_name>

MONGO_DB_NAME=BloodDonationDB

JWT_SECRET=<replace_with_a_long_random_secret>

FRONTEND_URL=http://localhost:8081

OPENAI_API_KEY=<your_openai_api_key>
```

### Environment Variable Description

| Variable | Description |
|---|---|
| BACKEND_PORT | Port used by the backend server. |
| MONGO_URI | MongoDB connection string. |
| MONGO_DB_NAME | Name of the application database. |
| JWT_SECRET | Secret used for signing and verifying authentication tokens. |
| FRONTEND_URL | Frontend development URL specified in the environment template. |
| OPENAI_API_KEY | API key used for optional OpenAI-powered chatbot functionality. |

**Important:**

- Replace all placeholders with your actual configuration values.
- URL-encode special characters in MongoDB usernames and passwords.
- Generate a strong, random JWT secret.
- Never upload your real `.env` file to GitHub.
- Never expose API keys, passwords, database credentials, or authentication secrets.

---

## 15. Running the Application

The project components run independently. Open separate terminals for each service.

### Terminal 1: Start the Eligibility API

From the `eligibility_api/` directory:

```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

The eligibility API will be available at:

```text
http://127.0.0.1:8000
```

### Terminal 2: Start the Backend Server

From the `backend/` directory:

```bash
npm run dev
```

The backend API will run on the configured backend port, normally:

```text
http://localhost:5000
```

### Terminal 3: Start the Mobile Application

From the `frontend/` directory:

```bash
npm run start:lan
```

You can also use:

```bash
npm run android
```

### Terminal 4: Start the Admin Dashboard

From the `admin/` directory:

```bash
npm run dev
```

The Vite development server is configured to use port `8080`.

---

## 16. Testing

The project includes a matching-engine integration test script.

From the backend directory:

```bash
npm run test:matching
```

The test script covers selected donor matching scenarios, including:

- Exact blood group matches in the same district.
- Exact blood group matches in neighboring districts.
- Compatible blood group matching.
- No-match scenarios.

Additional linting and build checks can be performed using the available frontend and admin scripts.

---

## 17. Security and Privacy

The project includes several security-related mechanisms:

- Password hashing using bcryptjs.
- JWT-based authentication.
- Protected administrative routes.
- Role and capability-based access checks.
- Environment-based secret configuration.
- Database-backed application records.

For production deployment, additional security measures should be implemented and reviewed, including:

- HTTPS for all application services.
- Strong database access controls.
- API rate limiting.
- Strict CORS configuration.
- Secure handling of donor and patient information.
- Stronger administrator authentication.
- Regular security testing and backups.

---

## 18. Future Improvements

Potential future improvements include:

- Integration with hospitals and authorized blood banks.
- Improved donor location and distance calculations.
- More comprehensive machine learning evaluation.
- Improved emergency notification delivery.
- Expanded analytics and reporting.
- Additional language support.
- Enhanced mobile accessibility.
- More comprehensive automated testing.
- Clinical evaluation and validation with qualified healthcare professionals.

---

## 19. Limitations

This project is currently a research and software prototype.

Its matching engine identifies potential donors using predefined rules. The eligibility prediction service provides decision-support information and does not establish medical clearance.

Some integrations, including external SMS and push notifications, require additional configuration and credentials.

The application has not been established as a clinically validated blood transfusion service. Professional donor screening and laboratory compatibility testing remain necessary.

---

## 20. Contributing

Contributions and suggestions are welcome.

To contribute:

1. Fork the repository.
2. Create a new branch.
3. Implement your changes.
4. Test your changes.
5. Submit a pull request with a clear explanation of your contribution.

Please avoid including private information, API keys, passwords, or sensitive donor and patient records.

---

## 21. License

No license file is currently included in this repository. An explicit license should be added before granting permission for external reuse, modification, or redistribution.

---

## 22. Conclusion

The AI-Powered Blood Donation Matching and Emergency Alert System aims to improve how blood donors and people in need of blood connect, particularly during urgent medical situations.

By combining mobile technology, donor matching algorithms, eligibility screening, emergency alerts, and administrative management, the project provides a centralized approach to improving blood donation coordination.

Ultimately, the project seeks to support faster communication, better donor organization, and more accessible blood donation coordination in Mogadishu, Somalia.
