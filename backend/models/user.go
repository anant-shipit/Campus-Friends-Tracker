package models

import "time"

// User represents an authenticated student.
type User struct {
	ID                  int       `json:"id"`
	GoogleID            string    `json:"-"`                      // never exposed to client
	Email               string    `json:"email"`
	Name                string    `json:"name"`
	PictureURL          string    `json:"pictureUrl"`
	Role                string    `json:"role"`                   // "user" or "admin"
	BatchCode           *string   `json:"batchCode,omitempty"`
	InviteCode          string    `json:"inviteCode"`
	InviteCodeExpiresAt time.Time `json:"inviteCodeExpiresAt"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}
