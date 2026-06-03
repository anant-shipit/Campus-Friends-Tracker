# 🎓 Campus Friends Tracker

A premium, interactive web application for university students to track, compare, and coordinate schedules with friends. Built with high-fidelity aesthetics, glassmorphism UI, robust caching, and smooth micro-animations.

## 🌟 Key Features

- **Dynamic Interactive Timetables**: View your personal schedule and quickly compare it with friends.
- **Glassmorphism UI/UX**: Premium aesthetic styling with HSL tailored color schemes, subtle glow effects, and modern layouts.
- **Integrated Peer Coordination**: Identify common free time slots instantly for group study or hangout sessions.
- **Private Roommate Sessions**: Dedicated sub-views for managing private study group sessions or roommate schedules.
- **Optimized Caching & Performance**: Custom cache layer for lightning-fast schedule loading and offline compatibility.
- **PWA-Ready & Optimized**: Optimized heading structures, PWA manifest configurations, and Robots.txt targeting standard SEO / accessibility checklists.

---

## 🛠️ Local Development

### Prerequisites
- [Go](https://go.dev/) (1.20+)
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (Running local instance or cloud URI)

### 1. Google Cloud Setup (OAuth)
1. Create OAuth 2.0 Credentials (Web Application) in the [Google Cloud Console](https://console.cloud.google.com/).
2. Add Authorized JavaScript Origin: `http://localhost:5173`.
3. In **OAuth Consent Screen**, set **User Type** to **External**. Add your email under **Test Users**.

### 2. Run Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and fill out your `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   # Update DB_HOST, DB_USER, DB_PASSWORD, GOOGLE_CLIENT_ID, and JWT_SECRET
   ```
3. Fetch dependencies and run:
   ```bash
   go mod tidy
   go run . --seed      # Seeds the database automatically on first startup
   ```

### 3. Run Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Create your `.env` file:
   ```bash
   echo "VITE_GOOGLE_CLIENT_ID=your_client_id_here" > .env
   ```
3. Install dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```

---

## 🌐 Production & Vercel Deployment

Deploy your backend publicly (e.g., Render, Railway, Fly.io) and configure the following environment variables on Vercel:

- `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
- `VITE_API_BASE_URL`: Your deployed backend URL + `/api` (e.g., `https://your-backend.com/api`).

**Important Configuration Steps**:
1. Add your Vercel URL (e.g., `https://your-app.vercel.app`) to **Authorized JavaScript origins** in the Google Cloud Console.
2. Set `FRONTEND_URL` on your backend to your Vercel URL to allow CORS.

---

## ❓ Troubleshooting

- **`Error 401: invalid_client`**: `VITE_GOOGLE_CLIENT_ID` environment variable is missing on Vercel. Ensure it is defined and redeployed.
- **`Error 403: org_internal`**: Google OAuth user type is "Internal". Change it to **External** on the OAuth Consent Screen and add your email to **Test Users**.
- **Origin not allowed / `origin_mismatch`**: Your Vercel URL or `http://localhost:5173` is not added under **Authorized JavaScript origins** in Google Cloud. Settings take 5–10 mins to apply.
