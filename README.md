# 🎓 Campus Friends Tracker

A mobile-first PWA for TIET students to track friends' class schedules in real-time, find common free slots, and figure out when the room is empty — built with a dark glassmorphism UI that works offline.

## ✨ Features

- **Friends Dashboard** — Add friends by batch code, see real-time status (Free / In Lecture / Tutorial / Lab), filter by availability, and manage roommates
- **Common Free Time** — Select 2+ friends and a day to instantly find overlapping free slots with duration
- **Private Session** — Mark roommates and see when everyone is in class (room is empty), with merged consecutive slots
- **Friend Detail Timeline** — Tap a friend to view their full day schedule with a NOW badge on the current slot
- **Offline-First** — Timetable cached in localStorage after first fetch; friends list stored client-side; works fully offline
- **PWA** — Installable on mobile, service worker with Workbox, auto-updating
- **Toast Notifications** — Contextual feedback on all user actions
- **SEO Optimized** — Proper meta tags, Open Graph, heading hierarchy, robots.txt, font preloading

## 🏗️ Tech Stack

| Layer    | Technology                                        |
|----------|---------------------------------------------------|
| Frontend | React 19, Vite 6, Vanilla CSS, vite-plugin-pwa    |
| Backend  | Go (Gin), PostgreSQL (pgx)                        |
| Data     | Embedded JSON timetable seeded into PostgreSQL     |
| Deploy   | Docker Compose, Vercel-ready                       |

## 🛠️ Local Development

### Prerequisites
- Go 1.22+, Node.js 18+, PostgreSQL 16 (or Docker)

### Start PostgreSQL
```bash
docker compose up -d postgres
```

### Run Backend
```bash
cd backend
cp .env.example .env
go mod tidy
go run . --seed         # Seeds DB from embedded JSON (first run only)
```

### Run Frontend
```bash
cd frontend
npm install
npm run dev             # http://localhost:5173 (proxies /api → :8080)
```

### Production Build
```bash
cd frontend
npm run build && npm run preview
```

## 🐳 Docker Compose
```bash
docker compose up --build
# PostgreSQL :5432 | Backend :8080 | Frontend :3000
```

## 🌍 Environment Variables

| Variable           | Default             | Description              |
|--------------------|---------------------|--------------------------|
| `DB_HOST`          | `localhost`         | PostgreSQL host          |
| `DB_PORT`          | `5432`              | PostgreSQL port          |
| `DB_USER`          | `postgres`          | Database user            |
| `DB_PASS`          | `postgres`          | Database password        |
| `DB_NAME`          | `campus_tracker`    | Database name            |
| `PORT`             | `8080`              | Backend port             |
| `FRONTEND_URL`     | `http://localhost:5173` | CORS allowed origin (set to `http://localhost:3000` for Docker) |
| `VITE_API_BASE_URL`| `/api`              | Frontend API base URL    |

## 📡 API

| Method | Endpoint             | Description                                    |
|--------|----------------------|------------------------------------------------|
| GET    | `/api/health`        | Health check                                   |
| GET    | `/api/schedules/all` | Full timetable + batch groups (cached by frontend) |

## 🚀 Deployment

1. Deploy backend to Render / Railway / Fly.io
2. Deploy frontend to Vercel with `VITE_API_BASE_URL` pointing to your backend
3. Set `FRONTEND_URL` on backend to your Vercel URL for CORS

## 👤 Author

**Anant Singh Rathore** — [@anant-shipit](https://github.com/anant-shipit) · anantsinghrathore97@gmail.com
