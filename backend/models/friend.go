package models

import "time"

// Friend represents a tracked friend.
type Friend struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	BatchCode string    `json:"batchCode"`
	CreatedAt time.Time `json:"createdAt"`
}

// FriendStatus extends Friend with real-time availability information.
type FriendStatus struct {
	Friend
	CurrentStatus string    `json:"currentStatus"` // "free", "in_class"
	CurrentClass  *ClassInfo `json:"currentClass,omitempty"`
	NextClass     *ClassInfo `json:"nextClass,omitempty"`
}

// ClassInfo describes a specific class session.
type ClassInfo struct {
	SubjectName string `json:"subjectName"`
	ClassType   string `json:"classType"`
	Room        string `json:"room,omitempty"`
	StartsAt    string `json:"startsAt,omitempty"`
	EndsAt      string `json:"endsAt,omitempty"`
}
