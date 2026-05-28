# 🎓 Campus Friends Tracker

A lightweight, mobile-first web app to check which of your campus friends are currently free or in class, view their daily schedules, and find common free time slots.

![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat-square&logo=go)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)

## Features

- **Real-time Friend Status** — See who's free and who's in class right now
- **Visual Day Timeline** — Beautiful vertical timeline of any friend's daily schedule
- **Common Free Time** — Select multiple friends to find when everyone is free
- **Smart Filtering** — Quick filter to show only free friends
- **Mobile-First Design** — Gorgeous dark glassmorphism UI optimized for phones
- **Batch-Based Lookup** — Just enter a friend's name and batch code

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### Run with Docker (Recommended)

```bash
# Clone the repo
git clone <your-repo-url>
cd campus-friends-tracker

# Copy env template
cp .env.example .env

# Start everything
docker-compose up -d

# Seed the timetable data (first time only)
docker exec campus-tracker-backend ./campus-tracker --seed

# Open the app
open http://localhost:3000
```

### Run Locally (Development)

#### Backend

```bash
# Prerequisites: Go 1.22+, PostgreSQL running on localhost:5432

cd backend

# Create the database
createdb campus_tracker

# Copy env
cp ../.env.example .env

# Install dependencies
go mod tidy

# Run with seeding (first time)
go run . --seed

# Run without seeding (subsequent times)
go run .
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to `http://localhost:8080`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go + [Gin](https://github.com/gin-gonic/gin) |
| Database | PostgreSQL 16 |
| Frontend | React 18 + [Vite](https://vitejs.dev/) |
| Styling | Vanilla CSS (Dark Glassmorphism) |
| Deployment | Docker Compose |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/batches` | List all batches grouped by year |
| `GET` | `/api/friends` | List all friends with current status |
| `POST` | `/api/friends` | Add a friend |
| `DELETE` | `/api/friends/:id` | Remove a friend |
| `GET` | `/api/friends/:id/schedule` | Friend's day schedule |
| `GET` | `/api/friends/free-now` | Friends currently free |
| `POST` | `/api/friends/common-free` | Common free slots |

## Data Source

Timetable data is sourced from [utkarsh-1905/time-table](https://github.com/utkarsh-1905/time-table) and covers:

- 1st Year (Sections A & B)
- 2nd Year (Sections A & B)
- 3rd Year (Sections A & B)
- 4th Year (Section A)
- PG Programs

**425+ batches** with complete Monday–Friday schedules.

## Project Structure

```
campus-friends-tracker/
├── backend/
│   ├── main.go              # Entry point
│   ├── config/              # Environment config
│   ├── database/            # DB connection & migrations
│   ├── models/              # Data structs
│   ├── handlers/            # HTTP handlers
│   ├── services/            # Business logic & seeding
│   └── data/                # Timetable JSON files
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── api/             # API client
│   │   └── index.css        # Design system
│   └── index.html
├── docker-compose.yml
└── .env.example
```

## License

This is a personal, non-commercial campus project. Built with ❤️ for TIET students.
