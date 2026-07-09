package database

import (
	"context"
	"fmt"
	"log"

	"campus-friends-tracker/backend/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool

// InitDB creates a connection pool to PostgreSQL using the provided config.
func InitDB(cfg *config.Config) error {
	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=require",
		cfg.DBUser, cfg.DBPass, cfg.DBHost, cfg.DBPort, cfg.DBName,
	)

	var err error
	pool, err = pgxpool.New(context.Background(), connStr)
	if err != nil {
		return fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("unable to ping database: %w", err)
	}

	log.Println("✅ Connected to PostgreSQL")
	return nil
}

// GetDB returns the active connection pool.
func GetDB() *pgxpool.Pool {
	return pool
}

// CloseDB gracefully closes the connection pool.
func CloseDB() {
	if pool != nil {
		pool.Close()
	}
}
