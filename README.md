# 🎓 Campus Friends Tracker

A mobile-first web app built for TIET students to figure out which of your friends are currently free or stuck in class. Check their daily schedules, find common free time slots to hang out, and manage your campus circle securely.

![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat-square&logo=go)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)

## What's New?

- **Google Workspace Sign-In** — Secured strictly to `@thapar.edu` email addresses.
- **Private Friend Networks** — Build your own friend list by sharing unique invite links and scanning QR codes (no public directories).
- **Admin Controls** — Role-based dashboard to moderate the platform, view usage stats, and manage accounts.

## Core Features

- **Real-time Friend Status** — Instantly see who's free and who's in class right now.
- **Visual Day Timeline** — Clean vertical timeline of any friend's daily schedule.
- **Common Free Time** — Select multiple friends to find out when everyone is free at the same time.
- **Smart Filtering** — Quick filter to show only free friends.
- **Mobile-First Design** — Gorgeous dark glassmorphism UI optimized for phones.

## Quick Start (Local Development)

### 1. Google Cloud Setup
You'll need a Google Client ID to enable sign-ins:
1. Go to Google Cloud Console and create OAuth 2.0 Credentials (Web Application).
2. Set Authorized JavaScript Origins to `http://localhost:5173`.

### 2. Backend Setup
```bash
# Prerequisites: Go 1.22+, PostgreSQL running on localhost:5432

cd backend
createdb campus_tracker

# Copy env and add your Google Client ID + a secure JWT secret
cp .env.example .env

go mod tidy

# Run and seed the timetable data (first time)
go run . --seed
```

### 3. Frontend Setup
```bash
cd frontend

# Create the frontend env file
echo "VITE_GOOGLE_CLIENT_ID=your_client_id_here" > .env

npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to `http://localhost:8080`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go + [Gin](https://github.com/gin-gonic/gin), JWT Auth |
| Database | PostgreSQL 16 |
| Frontend | React 18 + [Vite](https://vitejs.dev/) |
| Styling | Vanilla CSS (Dark Glassmorphism) |

## Key API Routes

All endpoints (except Google login) require a Bearer JWT token.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/google` | Google One Tap / Login |
| `GET` | `/api/friends` | List your private friends & their status |
| `POST` | `/api/friends/invite/:code` | Accept a friend's invite |
| `GET` | `/api/friends/invite-info` | Get your personal invite QR/link |
| `GET` | `/api/friends/:id/schedule` | Friend's day schedule |
| `POST` | `/api/friends/common-free` | Common free slots among selected friends |
| `GET` | `/api/admin/stats` | (Admin) View total users and active links |

## Data Source

Timetable data is sourced from [utkarsh-1905/time-table](https://github.com/utkarsh-1905/time-table) and covers:
- 1st to 4th Year B.E. Sections + PG Programs
- **425+ batches** with complete Monday–Friday schedules.

## License

This is a personal, non-commercial campus project. Built with ❤️ for TIET students.
