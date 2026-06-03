package main

import (
	"log"
	"os"

	"campus-friends-tracker/backend/config"
	"campus-friends-tracker/backend/database"
	"campus-friends-tracker/backend/handlers"
	"campus-friends-tracker/backend/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file (optional — won't fail if missing).
	if err := godotenv.Load(); err != nil {
		log.Println("ℹ️  No .env file found, using environment variables")
	}

	// Load configuration.
	cfg := config.Load()

	// Initialize database connection.
	if err := database.InitDB(cfg); err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer database.CloseDB()

	// Run migrations.
	if err := database.RunMigrations(); err != nil {
		log.Fatalf("❌ Failed to run migrations: %v", err)
	}

	// Check for --seed flag.
	for _, arg := range os.Args[1:] {
		if arg == "--seed" {
			if err := services.SeedDatabase(); err != nil {
				log.Fatalf("❌ Failed to seed database: %v", err)
			}
			break
		}
	}

	// Set up Gin router.
	r := gin.Default()

	// CORS middleware — allow frontend origin.
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendURL, "http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))



	// Health check (public).
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Register API routes.
	api := r.Group("/api")
	{
		// === Public routes ===
		api.GET("/schedules/all", handlers.GetAllSchedules)
	}

	// Start server.
	port := cfg.Port
	log.Printf("🚀 Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}
