# 🎓 Campus Friends Tracker

A mobile-first web app for TIET students to see free schedules and hang out.

## 🛠️ Local Development

### 1. Google Cloud Setup
1. Create OAuth 2.0 Credentials (Web Application) in [Google Cloud Console](https://console.cloud.google.com/).
2. Add Authorized JavaScript Origin: `http://localhost:5173`.
3. In **OAuth Consent Screen**, set **User Type** to **External**. If in testing, add your email under **Test Users**.

### 2. Run Backend
```bash
cd backend
cp .env.example .env # Add DB details, Google Client ID & JWT secret
go mod tidy
go run . --seed      # Seeds database
```

### 3. Run Frontend
```bash
cd frontend
echo "VITE_GOOGLE_CLIENT_ID=your_client_id_here" > .env
npm install
npm run dev
```

---

## 🌐 Production & Vercel Deployment

Deploy your backend publicly (e.g. Render, Railway) and add these environment variables on Vercel:
- `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
- `VITE_API_BASE_URL`: Your deployed backend URL + `/api` (e.g., `https://your-backend.com/api`).

**Important**:
1. Add your Vercel URL (e.g., `https://your-app.vercel.app`) to **Authorized JavaScript origins** in Google Cloud Console.
2. Set `FRONTEND_URL` on your backend to your Vercel URL to allow CORS.

---

## ❓ Common Errors

* **`Error 401: invalid_client`**: `VITE_GOOGLE_CLIENT_ID` environment variable is missing on Vercel. Ensure it is defined and redeployed.
* **`Error 403: org_internal`**: Google OAuth user type is "Internal". Change it to **External** on the OAuth Consent Screen and add your email to **Test Users**.
* **Origin not allowed / `origin_mismatch`**: Your Vercel URL or `http://localhost:5173` is not added under **Authorized JavaScript origins** in Google Cloud. Settings take 5–10 mins to apply.
