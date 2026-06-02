package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type visitor struct {
	tokens    int
	lastReset time.Time
}

// RateLimiter implements a simple per-IP token bucket rate limiter.
type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     int           // max requests per window
	window   time.Duration // reset window
}

// NewRateLimiter creates a rate limiter with the given max requests per window.
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		window:   window,
	}

	// Clean up old entries periodically.
	go func() {
		for {
			time.Sleep(window * 2)
			rl.mu.Lock()
			for ip, v := range rl.visitors {
				if time.Since(v.lastReset) > window*2 {
					delete(rl.visitors, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return rl
}

// Middleware returns a Gin middleware that rate-limits requests by client IP.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		rl.mu.Lock()
		v, exists := rl.visitors[ip]
		if !exists {
			v = &visitor{tokens: rl.rate, lastReset: time.Now()}
			rl.visitors[ip] = v
		}

		// Reset tokens if window has passed.
		if time.Since(v.lastReset) > rl.window {
			v.tokens = rl.rate
			v.lastReset = time.Now()
		}

		if v.tokens <= 0 {
			rl.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests, please try again later",
			})
			return
		}

		v.tokens--
		rl.mu.Unlock()

		c.Next()
	}
}
