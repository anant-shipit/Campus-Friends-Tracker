package middleware

import (
	"context"
	"net/http"

	"campus-friends-tracker/backend/database"
	"github.com/gin-gonic/gin"
)

// AdminRequired returns a Gin middleware that ensures the authenticated user has the 'admin' role.
// It must be placed AFTER AuthRequired in the middleware chain.
func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := GetUserID(c)

		db := database.GetDB()
		ctx := context.Background()

		var role string
		err := db.QueryRow(ctx, "SELECT role FROM users WHERE id = $1", userID).Scan(&role)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "failed to verify permissions"})
			return
		}

		if role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			return
		}

		c.Next()
	}
}
