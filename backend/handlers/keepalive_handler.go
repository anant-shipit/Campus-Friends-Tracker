package handlers

import (
	"context"
	"net/http"
	"time"

	"campus-friends-tracker/backend/database"
	"campus-friends-tracker/backend/middleware"

	"github.com/gin-gonic/gin"
)

// KeepAlive is a lightweight endpoint for external pingers (e.g., UptimeRobot)
// to keep both Render and Aiven awake.
func KeepAlive(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	if err := database.PingDB(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":   "unhealthy",
			"database": "unreachable",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"status":   "healthy",
		"database": "connected",
	})
}

// GetStats returns real traffic metrics (excludes keepalive/health pings).
func GetStats(c *gin.Context) {
	c.JSON(http.StatusOK, middleware.GetTrafficStats())
}
