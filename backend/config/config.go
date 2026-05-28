package config

import (
	"os"
)

// Config holds application configuration loaded from environment variables.
type Config struct {
	DBHost string
	DBPort string
	DBUser string
	DBPass string
	DBName string
	Port   string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		DBHost: getEnv("DB_HOST", "localhost"),
		DBPort: getEnv("DB_PORT", "5432"),
		DBUser: getEnv("DB_USER", "postgres"),
		DBPass: getEnv("DB_PASS", "postgres"),
		DBName: getEnv("DB_NAME", "campus_tracker"),
		Port:   getEnv("PORT", "8080"),
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
