package config

import (
	"os"
)

// Config holds application configuration loaded from environment variables.
type Config struct {
	DBHost          string
	DBPort          string
	DBUser          string
	DBPass          string
	DBName          string
	Port            string
	GoogleClientID  string
	JWTSecret       string
	FrontendURL     string
	SuperAdminEmail string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		DBHost:          getEnv("DB_HOST", "localhost"),
		DBPort:          getEnv("DB_PORT", "5432"),
		DBUser:          getEnv("DB_USER", "postgres"),
		DBPass:          getEnv("DB_PASS", "postgres"),
		DBName:          getEnv("DB_NAME", "campus_tracker"),
		Port:            getEnv("PORT", "8080"),
		GoogleClientID:  getEnv("GOOGLE_CLIENT_ID", ""),
		JWTSecret:       getEnv("JWT_SECRET", "change-me-to-a-random-secret-in-production"),
		FrontendURL:     getEnv("FRONTEND_URL", "http://localhost:5173"),
		SuperAdminEmail: getEnv("SUPER_ADMIN_EMAIL", ""),
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
