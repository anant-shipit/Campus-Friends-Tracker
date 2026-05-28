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
