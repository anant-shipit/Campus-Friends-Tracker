package database

import (
	"context"
	"log"
)

const migrationsSQL = `
CREATE TABLE IF NOT EXISTS subjects (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    credit VARCHAR(10),
    is_core BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    year_group VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_slots (
    id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL,
    slot_index SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject_code VARCHAR(10),
    subject_name TEXT,
    class_type VARCHAR(20) NOT NULL,
    room TEXT,
    raw_text TEXT,
    UNIQUE(batch_id, day_of_week, slot_index)
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    picture_url TEXT,
    role VARCHAR(20) DEFAULT 'user',
    batch_code VARCHAR(100),
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    invite_code_expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '6 hours'),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK(user_id != friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

-- Legacy table kept for reference; no longer used by the app.
CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    batch_code VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(name, batch_code)
);
`

// RunMigrations creates all required tables if they don't already exist.
func RunMigrations() error {
	_, err := pool.Exec(context.Background(), migrationsSQL)
	if err != nil {
		return err
	}
	log.Println("✅ Migrations applied successfully")
	return nil
}
