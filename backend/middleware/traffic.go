package middleware

import (
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	realRequests atomic.Int64
	startedAt    = time.Now().UTC()
)

// TrafficCounter is a Gin middleware that counts real API requests,
// excluding keepalive and health pings.
func TrafficCounter(c *gin.Context) {
	realRequests.Add(1)
	c.Next()
}

// GetTrafficStats returns the current traffic counters.
func GetTrafficStats() gin.H {
	return gin.H{
		"realRequests": realRequests.Load(),
		"upSince":      startedAt.Format(time.RFC3339),
	}
}
