package database

import (
	"context"
	"fmt"
	"log"
	"net"
	"strings"
	"time"

	"campus-friends-tracker/backend/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

var pool *pgxpool.Pool

// InitDB creates a connection pool to PostgreSQL using the provided config.
// Pool settings are tuned for Aiven's free-tier connection limits.
func InitDB(cfg *config.Config) error {
	host := strings.ToLower(strings.TrimSpace(cfg.DBHost))
	sslMode := "verify-full"
	
	if host == "localhost" {
		sslMode = "disable"
	} else if ip := net.ParseIP(host); ip != nil && ip.IsLoopback() {
		sslMode = "disable"
	}

	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		cfg.DBUser, cfg.DBPass, cfg.DBHost, cfg.DBPort, cfg.DBName, sslMode,
	)

	poolCfg, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return fmt.Errorf("unable to parse connection string: %w", err)
	}

	// Aiven free tier allows ~5 connections; keep pool small with headroom.
	poolCfg.MaxConns = 3
	poolCfg.MinConns = 1
	poolCfg.MaxConnLifetime = 30 * time.Minute
	poolCfg.MaxConnIdleTime = 5 * time.Minute
	poolCfg.HealthCheckPeriod = 1 * time.Minute

	pool, err = pgxpool.NewWithConfig(context.Background(), poolCfg)
	if err != nil {
		return fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("unable to ping database: %w", err)
	}

	log.Println("✅ Connected to PostgreSQL")
	return nil
}

// PingDB executes a lightweight round-trip to verify the database is reachable.
func PingDB(ctx context.Context) error {
	return pool.Ping(ctx)
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
