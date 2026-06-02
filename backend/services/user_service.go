package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"time"

	"campus-friends-tracker/backend/database"
	"campus-friends-tracker/backend/models"
)

const inviteCodeLength = 8
const inviteCodeDuration = 6 * time.Hour

// generateInviteCode returns a cryptographically random alphanumeric code.
func generateInviteCode() (string, error) {
	bytes := make([]byte, inviteCodeLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes)[:inviteCodeLength], nil
}

// FindOrCreateUser looks up a user by Google ID, or creates a new one.
// Name, email, and picture are always updated from Google on login.
func FindOrCreateUser(googleID, email, name, picture string) (*models.User, error) {
	db := database.GetDB()
	ctx := context.Background()

	// Try to find existing user.
	var u models.User
	err := db.QueryRow(ctx,
		`SELECT id, google_id, email, name, picture_url, role, batch_code,
		        invite_code, invite_code_expires_at, created_at, updated_at
		 FROM users WHERE google_id = $1`, googleID,
	).Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.PictureURL, &u.Role,
		&u.BatchCode, &u.InviteCode, &u.InviteCodeExpiresAt, &u.CreatedAt, &u.UpdatedAt)

	if err == nil {
		// User exists — update profile fields from Google.
		// Also enforce super admin role.
		newRole := u.Role
		if os.Getenv("SUPER_ADMIN_EMAIL") != "" && email == os.Getenv("SUPER_ADMIN_EMAIL") {
			newRole = "admin"
		}
		
		_, err = db.Exec(ctx,
			`UPDATE users SET name = $1, email = $2, picture_url = $3, role = $4, updated_at = NOW()
			 WHERE id = $5`, name, email, picture, newRole, u.ID)
		if err != nil {
			return nil, fmt.Errorf("update user profile: %w", err)
		}
		u.Name = name
		u.Email = email
		u.PictureURL = picture
		u.Role = newRole
		return &u, nil
	}

	// Create new user.
	code, err := generateInviteCode()
	if err != nil {
		return nil, fmt.Errorf("generate invite code: %w", err)
	}

	expiresAt := time.Now().Add(inviteCodeDuration)

	role := "user"
	if os.Getenv("SUPER_ADMIN_EMAIL") != "" && email == os.Getenv("SUPER_ADMIN_EMAIL") {
		role = "admin"
	}

	err = db.QueryRow(ctx,
		`INSERT INTO users (google_id, email, name, picture_url, role, invite_code, invite_code_expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, google_id, email, name, picture_url, role, batch_code,
		           invite_code, invite_code_expires_at, created_at, updated_at`,
		googleID, email, name, picture, role, code, expiresAt,
	).Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.PictureURL, &u.Role,
		&u.BatchCode, &u.InviteCode, &u.InviteCodeExpiresAt, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	return &u, nil
}

// GetUserByID retrieves a user by their database ID.
func GetUserByID(id int) (*models.User, error) {
	db := database.GetDB()
	ctx := context.Background()

	var u models.User
	err := db.QueryRow(ctx,
		`SELECT id, google_id, email, name, picture_url, role, batch_code,
		        invite_code, invite_code_expires_at, created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.PictureURL, &u.Role,
		&u.BatchCode, &u.InviteCode, &u.InviteCodeExpiresAt, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("user %d not found: %w", id, err)
	}
	return &u, nil
}

// GetUserByInviteCode retrieves a user by their invite code.
// Returns an error if the invite code has expired.
func GetUserByInviteCode(code string) (*models.User, error) {
	db := database.GetDB()
	ctx := context.Background()

	var u models.User
	err := db.QueryRow(ctx,
		`SELECT id, google_id, email, name, picture_url, role, batch_code,
		        invite_code, invite_code_expires_at, created_at, updated_at
		 FROM users WHERE invite_code = $1`, code,
	).Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.PictureURL, &u.Role,
		&u.BatchCode, &u.InviteCode, &u.InviteCodeExpiresAt, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("invite code not found: %w", err)
	}

	if time.Now().After(u.InviteCodeExpiresAt) {
		return nil, fmt.Errorf("invite code has expired")
	}

	return &u, nil
}

// UpdateBatchCode sets or updates a user's batch code.
func UpdateBatchCode(userID int, batchCode string) error {
	db := database.GetDB()
	ctx := context.Background()

	// Validate batch exists.
	var exists bool
	err := db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM batches WHERE code = $1)", batchCode).Scan(&exists)
	if err != nil {
		return fmt.Errorf("check batch: %w", err)
	}
	if !exists {
		return fmt.Errorf("batch %q does not exist", batchCode)
	}

	_, err = db.Exec(ctx,
		`UPDATE users SET batch_code = $1, updated_at = NOW() WHERE id = $2`,
		batchCode, userID)
	if err != nil {
		return fmt.Errorf("update batch: %w", err)
	}
	return nil
}

// RegenerateInviteCode creates a new invite code for the user (resets 6h timer).
func RegenerateInviteCode(userID int) (string, time.Time, error) {
	db := database.GetDB()
	ctx := context.Background()

	code, err := generateInviteCode()
	if err != nil {
		return "", time.Time{}, fmt.Errorf("generate invite code: %w", err)
	}

	expiresAt := time.Now().Add(inviteCodeDuration)

	_, err = db.Exec(ctx,
		`UPDATE users SET invite_code = $1, invite_code_expires_at = $2, updated_at = NOW()
		 WHERE id = $3`,
		code, expiresAt, userID)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("update invite code: %w", err)
	}

	return code, expiresAt, nil
}

// GetAllUsers returns all registered users (for admin panel).
func GetAllUsers() ([]models.User, error) {
	db := database.GetDB()
	ctx := context.Background()

	rows, err := db.Query(ctx,
		`SELECT id, email, name, picture_url, role, batch_code, created_at 
		 FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.PictureURL, &u.Role, &u.BatchCode, &u.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	return users, nil
}

// UpdateUserRole updates a user's role.
func UpdateUserRole(userID int, role string) error {
	if role != "user" && role != "admin" {
		return fmt.Errorf("invalid role")
	}

	db := database.GetDB()
	ctx := context.Background()

	res, err := db.Exec(ctx, `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`, role, userID)
	if err != nil {
		return fmt.Errorf("update role: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

// DeleteUserCascade completely removes a user and their friendships.
func DeleteUserCascade(userID int) error {
	db := database.GetDB()
	ctx := context.Background()

	res, err := db.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

// GetSystemStats returns aggregate statistics for the admin dashboard.
func GetSystemStats() (map[string]interface{}, error) {
	db := database.GetDB()
	ctx := context.Background()

	stats := make(map[string]interface{})

	// Total users
	var totalUsers int
	_ = db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&totalUsers)
	stats["totalUsers"] = totalUsers

	// Total friendships (divide by 2 because bidirectional)
	var totalFriendships int
	_ = db.QueryRow(ctx, `SELECT COUNT(*) FROM friendships`).Scan(&totalFriendships)
	stats["totalFriendships"] = totalFriendships / 2

	// Batch distribution
	rows, err := db.Query(ctx, `
		SELECT COALESCE(batch_code, 'Unassigned') as batch, COUNT(*) 
		FROM users GROUP BY batch_code ORDER BY COUNT(*) DESC
	`)
	if err == nil {
		defer rows.Close()
		batches := []map[string]interface{}{}
		for rows.Next() {
			var batch string
			var count int
			if err := rows.Scan(&batch, &count); err == nil {
				batches = append(batches, map[string]interface{}{
					"batch": batch,
					"count": count,
				})
			}
		}
		stats["batchDistribution"] = batches
	}

	return stats, nil
}
