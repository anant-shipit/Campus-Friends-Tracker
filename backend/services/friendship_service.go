package services

import (
	"context"
	"fmt"

	"campus-friends-tracker/backend/database"
	"campus-friends-tracker/backend/models"
)

// CreateFriendship creates a bidirectional friendship between two users.
func CreateFriendship(userID, friendID int) error {
	if userID == friendID {
		return fmt.Errorf("cannot befriend yourself")
	}

	db := database.GetDB()
	ctx := context.Background()

	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Insert both directions.
	_, err = tx.Exec(ctx,
		`INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)
		 ON CONFLICT (user_id, friend_id) DO NOTHING`,
		userID, friendID)
	if err != nil {
		return fmt.Errorf("create friendship A→B: %w", err)
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)
		 ON CONFLICT (user_id, friend_id) DO NOTHING`,
		friendID, userID)
	if err != nil {
		return fmt.Errorf("create friendship B→A: %w", err)
	}

	return tx.Commit(ctx)
}

// ListUserFriends returns all friends for a given user (as User objects).
func ListUserFriends(userID int) ([]models.User, error) {
	db := database.GetDB()
	ctx := context.Background()

	rows, err := db.Query(ctx,
		`SELECT u.id, u.google_id, u.email, u.name, u.picture_url, u.batch_code,
		        u.invite_code, u.invite_code_expires_at, u.created_at, u.updated_at
		 FROM friendships f
		 JOIN users u ON u.id = f.friend_id
		 WHERE f.user_id = $1
		 ORDER BY u.name`, userID)
	if err != nil {
		return nil, fmt.Errorf("list friends: %w", err)
	}
	defer rows.Close()

	var friends []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.GoogleID, &u.Email, &u.Name, &u.PictureURL,
			&u.BatchCode, &u.InviteCode, &u.InviteCodeExpiresAt,
			&u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		// Clear sensitive fields before returning.
		u.GoogleID = ""
		u.InviteCode = ""
		friends = append(friends, u)
	}
	return friends, nil
}

// RemoveFriendship removes a bidirectional friendship.
func RemoveFriendship(userID, friendID int) error {
	db := database.GetDB()
	ctx := context.Background()

	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx,
		`DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2`,
		userID, friendID)
	if err != nil {
		return fmt.Errorf("remove friendship A→B: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("friendship not found")
	}

	_, err = tx.Exec(ctx,
		`DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2`,
		friendID, userID)
	if err != nil {
		return fmt.Errorf("remove friendship B→A: %w", err)
	}

	return tx.Commit(ctx)
}

// AreFriends checks if two users are friends.
func AreFriends(userID, friendID int) (bool, error) {
	db := database.GetDB()
	ctx := context.Background()

	var exists bool
	err := db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2)`,
		userID, friendID).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}
