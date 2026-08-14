# 🎓 Campus Friends Tracker

A mobile-first PWA for TIET students to track friends' class schedules in real-time, find common free slots, and figure out when the room is empty — built with a premium dark glassmorphism SaaS UI inspired by Linear and Vercel.

## ✨ Features

- **Premium SaaS Dashboards** — Rebuilt all key views (Friends, Common Free, Roommates) into high-density, CLS-stable dashboards with real-time statistics.
- **Empty Room Finder** — A look-ahead algorithm that rounds time slots, maps upcoming schedule data, filters rooms dynamically by block using regex prefixes, and supports a local-storage "Use it Now" session tracker. Fully timezone-aligned to `Asia/Kolkata`.
- **Interactive Cursor Spotlight** — Smooth, performance-tuned radial spotlight that tracks the mouse with low opacity gradients and respects `prefers-reduced-motion`.
- **Layout Stability (CLS Prevention)** — Enforced container stability with `DashboardContainer` layout primitives and `min-height` reservations.
- **Common Free Time** — Interactive selector grid to choose multiple friends and locate overlapping availability using a sliding segmented control.
- **Roommates (Private Session)** — Calculate when the shared room is completely free (consecutive slot merging) with realistic empty state skeleton previews.
- **Accessibility & Transitions** — Full keyboard navigation (tabbing, arrows, Home/End) on controls, visible focus rings, and smooth `200ms` cross-fades.
- **Offline-First & PWA** — Offline-ready schedule caching, installable on mobile via Workbox-powered PWA with optimized high-resolution Android launcher icons and custom iOS apple-touch-icons.
- **Database & Web Keep-Alive** — Dedicated low-overhead `/api/keepalive` endpoint executing context-timeout `db.PingContext()` database pings to keep the Render free tier and Aiven PostgreSQL active.

## 🏗️ Tech Stack

| Layer    | Technology                                        |
|----------|---------------------------------------------------|
| Frontend | React 19, Vite 6, Tailwind CSS v4, PWA (Workbox) |
| Backend  | Go (Gin), PostgreSQL (pgx)                        |
| Styling  | Dark Glassmorphism, CSS Variables, Tailwind v4    |

## 🛠️ Local Development

### Prerequisites
- **Docker** (for PostgreSQL)
- **Go 1.25+**
- **Node.js 18+ / npm**

### 1. Database & Backend
```bash
# Spin up PostgreSQL
docker compose up -d postgres

# Start Go Backend
cd backend
cp .env.example .env
# Note: The default values in .env.example are sufficient for local development with the Docker setup.
go mod tidy
go run . --seed         # Seeds DB from embedded JSON (first run only)
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev             # http://localhost:5173 (proxies /api → :8080)
```

## 📡 API Overview

- `GET /api/health` — API health check
- `GET /api/keepalive` — Database ping context health check (pings Aiven DB, 3s timeout)
- `GET /api/stats` — Exposes requests statistics (requests counted by middleware)
- `GET /api/schedules/all` — Returns the fully consolidated JSON timetable database.

## 🚀 Key Layout Architecture

To maintain high consistency, the frontend leverages unified layout primitives:
- `DashboardContainer` — Aligns max-width and screen margins globally.
- `Stack`, `Section`, `Card` — Standardized structural components.
- `SegmentedControl` — Standardized accessible tab/weekday control.
- `EmptyState` — Contract-driven SVG line-art state loader with skeleton previews.

---
**Author:** Anant Singh Rathore — [@anant-shipit](https://github.com/anant-shipit)
