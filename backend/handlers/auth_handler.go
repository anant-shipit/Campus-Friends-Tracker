package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"campus-friends-tracker/backend/config"
	"campus-friends-tracker/backend/middleware"
	"campus-friends-tracker/backend/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// googleTokenPayload represents the relevant fields from Google's tokeninfo response.
type googleTokenPayload struct {
	Sub           string `json:"sub"`            // Google unique user ID
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Aud           string `json:"aud"`            // Should match our client ID
	Hd            string `json:"hd"`             // Hosted domain (e.g., thapar.edu)
}

type googleLoginRequest struct {
	IDToken string `json:"idToken" binding:"required"`
}

// GoogleLogin verifies a Google ID token and returns a JWT.
// POST /api/auth/google
func GoogleLogin(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req googleLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "idToken is required"})
			return
		}

		// Verify token with Google's tokeninfo endpoint.
		payload, err := verifyGoogleToken(req.IDToken, cfg.GoogleClientID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("invalid Google token: %v", err)})
			return
		}

		// Enforce @thapar.edu domain.
		if !strings.HasSuffix(strings.ToLower(payload.Email), "@thapar.edu") {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "only @thapar.edu email addresses are allowed",
			})
			return
		}

		// Create or find user.
		user, err := services.FindOrCreateUser(payload.Sub, payload.Email, payload.Name, payload.Picture)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process user account"})
			return
		}

		// Generate JWT.
		token, err := generateJWT(user.ID, user.Email, cfg.JWTSecret)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"user":  user,
		})
	}
}

// GetMe returns the current authenticated user's profile.
// GET /api/auth/me
func GetMe(c *gin.Context) {
	userID := middleware.GetUserID(c)

	user, err := services.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

type updateBatchRequest struct {
	BatchCode string `json:"batchCode" binding:"required"`
}

// UpdateBatch sets or updates the authenticated user's batch code.
// PUT /api/auth/batch
func UpdateBatch(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req updateBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "batchCode is required"})
		return
	}

	req.BatchCode = strings.TrimSpace(req.BatchCode)
	if req.BatchCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "batchCode cannot be empty"})
		return
	}

	if err := services.UpdateBatchCode(userID, req.BatchCode); err != nil {
		if strings.Contains(err.Error(), "does not exist") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update batch"})
		return
	}

	user, _ := services.GetUserByID(userID)
	c.JSON(http.StatusOK, gin.H{"user": user})
}

// verifyGoogleToken validates a Google ID token using Google's tokeninfo endpoint.
func verifyGoogleToken(idToken, clientID string) (*googleTokenPayload, error) {
	resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken)
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token verification failed (status %d): %s", resp.StatusCode, string(body))
	}

	var payload googleTokenPayload
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %w", err)
	}

	// Validate audience matches our client ID.
	if clientID != "" && payload.Aud != clientID {
		return nil, fmt.Errorf("token audience mismatch")
	}

	if payload.EmailVerified != "true" {
		return nil, fmt.Errorf("email not verified")
	}

	return &payload, nil
}

// generateJWT creates a signed JWT token for the given user.
func generateJWT(userID int, email, secret string) (string, error) {
	claims := middleware.Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)), // 7 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "campus-friends-tracker",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
