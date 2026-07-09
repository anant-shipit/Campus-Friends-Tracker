package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"campus-friends-tracker/backend/config"
	"campus-friends-tracker/backend/database"
	"campus-friends-tracker/backend/handlers"
	"campus-friends-tracker/backend/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// seedState tracks the background seed lifecycle so /api/health can
// report accurately. Render (and any upstream LB) should not route
// traffic until seeding finishes, because seedTimetable temporarily
// DELETEs all schedule data before reinserting.
type seedState struct {
	mu      sync.RWMutex
	running bool  // true while the goroutine is active
	err     error // non-nil if the seed failed
}

func (s *seedState) start()           { s.mu.Lock(); s.running = true; s.mu.Unlock() }
func (s *seedState) finish(err error) { s.mu.Lock(); s.running = false; s.err = err; s.mu.Unlock() }
func (s *seedState) status() (running bool, failed bool, errMsg string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.running {
		return true, false, ""
	}
	if s.err != nil {
		return false, true, s.err.Error()
	}
	return false, false, ""
}

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

	// Check for --seed flag. Seed in the background so it can never block
	// the HTTP server from binding to $PORT — Render kills the deploy if
	// no port opens within its scan window.
	var seed seedState
	seedRequested := false
	for _, arg := range os.Args[1:] {
		if arg == "--seed" {
			seedRequested = true
			seed.start()
			go func() {
				defer func() {
					if r := recover(); r != nil {
						err := fmt.Errorf("panic during seed: %v", r)
						log.Printf("ERROR ❌ Background seed panicked: %v", r)
						seed.finish(err)
					}
				}()
				if err := services.SeedDatabase(); err != nil {
					log.Printf("ERROR ❌ Background seed failed: %v", err)
					seed.finish(err)
					return
				}
				seed.finish(nil)
			}()
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

	// Health check (public). Reports 503 while seed is running or if it
	// failed, so load balancers don't route traffic to an instance with
	// empty/partial schedule data.
	r.GET("/api/health", func(c *gin.Context) {
		if !seedRequested {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
			return
		}
		running, failed, errMsg := seed.status()
		switch {
		case running:
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "seeding",
				"detail": "database seed in progress",
			})
		case failed:
			// Log the real error server-side; return a safe message to clients.
			log.Printf("Health check: seed failure detail: %s", errMsg)
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "seed_failed",
				"error":  "database seed did not complete successfully",
			})
		default:
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		}
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
