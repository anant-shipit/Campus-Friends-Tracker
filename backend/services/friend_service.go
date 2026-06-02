package services

import (
	"context"
	"fmt"
	"time"

	"campus-friends-tracker/backend/database"
	"campus-friends-tracker/backend/models"
)

var istLocation *time.Location

func init() {
	var err error
	istLocation, err = time.LoadLocation("Asia/Kolkata")
	if err != nil {
		panic("failed to load Asia/Kolkata timezone: " + err.Error())
	}
}

// AddFriend inserts a new friend, validating that the batch exists.
func AddFriend(name, batchCode string) (*models.Friend, error) {
	db := database.GetDB()
	ctx := context.Background()

	// Validate batch exists.
	var exists bool
	err := db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM batches WHERE code = $1)", batchCode).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("check batch: %w", err)
	}
	if !exists {
		return nil, fmt.Errorf("batch %q does not exist", batchCode)
	}

	var f models.Friend
	err = db.QueryRow(ctx,
		`INSERT INTO friends (name, batch_code) VALUES ($1, $2)
		 ON CONFLICT (name, batch_code) DO UPDATE SET name = EXCLUDED.name
		 RETURNING id, name, batch_code, created_at`,
		name, batchCode,
	).Scan(&f.ID, &f.Name, &f.BatchCode, &f.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert friend: %w", err)
	}

	return &f, nil
}

// DeleteFriend removes a friend by ID.
func DeleteFriend(id int) error {
	db := database.GetDB()
	ctx := context.Background()

	tag, err := db.Exec(ctx, "DELETE FROM friends WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete friend: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("friend with id %d not found", id)
	}
	return nil
}

// ListFriends returns all friends.
func ListFriends() ([]models.Friend, error) {
	db := database.GetDB()
	ctx := context.Background()

	rows, err := db.Query(ctx,
		"SELECT id, name, batch_code, created_at FROM friends ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friends []models.Friend
	for rows.Next() {
		var f models.Friend
		if err := rows.Scan(&f.ID, &f.Name, &f.BatchCode, &f.CreatedAt); err != nil {
			return nil, err
		}
		friends = append(friends, f)
	}
	return friends, nil
}

// GetFriendByID retrieves a single friend by ID.
func GetFriendByID(id int) (*models.Friend, error) {
	db := database.GetDB()
	ctx := context.Background()

	var f models.Friend
	err := db.QueryRow(ctx,
		"SELECT id, name, batch_code, created_at FROM friends WHERE id = $1", id,
	).Scan(&f.ID, &f.Name, &f.BatchCode, &f.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// GetFriendStatuses returns all friends with their current real-time status.
func GetFriendStatuses(friends []models.Friend) []models.FriendStatus {
	now := time.Now().In(istLocation)
	dayOfWeek := WeekdayToIndex(now.Weekday()) // 0=Mon..4=Fri, -1 for weekends

	statuses := make([]models.FriendStatus, 0, len(friends))

	for _, f := range friends {
		status := models.FriendStatus{
			Friend:        f,
			CurrentStatus: "free",
		}

		// Weekends: everyone is free.
		if dayOfWeek < 0 || dayOfWeek > 4 {
			statuses = append(statuses, status)
			continue
		}

		// Get today's schedule for this friend's batch.
		slots, err := GetDayScheduleByBatchCode(f.BatchCode, dayOfWeek)
		if err != nil || len(slots) == 0 {
			statuses = append(statuses, status)
			continue
		}

		currentSlotIdx := GetCurrentSlotIndex(now)

		// Check current slot.
		if currentSlotIdx >= 0 && currentSlotIdx < len(slots) {
			slot := slots[currentSlotIdx]
			if slot.ClassType != "free" {
				status.CurrentStatus = "in_class"
				status.CurrentClass = &models.ClassInfo{
					SubjectName: slot.SubjectName,
					ClassType:   slot.ClassType,
					Room:        slot.Room,
					StartsAt:    slot.StartTime,
					EndsAt:      slot.EndTime,
				}
			}
		}

		// Find next non-free slot.
		searchFrom := currentSlotIdx + 1
		if searchFrom < 0 {
			searchFrom = 0
		}
		for i := searchFrom; i < len(slots); i++ {
			if slots[i].ClassType != "free" {
				status.NextClass = &models.ClassInfo{
					SubjectName: slots[i].SubjectName,
					ClassType:   slots[i].ClassType,
					Room:        slots[i].Room,
					StartsAt:    slots[i].StartTime,
					EndsAt:      slots[i].EndTime,
				}
				break
			}
		}

		statuses = append(statuses, status)
	}

	return statuses
}

// GetFreeNowFriends returns friends who are currently free.
func GetFreeNowFriends() ([]models.FriendStatus, error) {
	friends, err := ListFriends()
	if err != nil {
		return nil, err
	}

	statuses := GetFriendStatuses(friends)

	var free []models.FriendStatus
	for _, s := range statuses {
		if s.CurrentStatus == "free" {
			free = append(free, s)
		}
	}
	return free, nil
}

// WeekdayToIndex converts Go's time.Weekday (Sunday=0) to our scheme (Mon=0..Fri=4, -1 for weekends).
func WeekdayToIndex(wd time.Weekday) int {
	switch wd {
	case time.Monday:
		return 0
	case time.Tuesday:
		return 1
	case time.Wednesday:
		return 2
	case time.Thursday:
		return 3
	case time.Friday:
		return 4
	default:
		return -1 // Saturday or Sunday
	}
}

// GetCurrentSlotIndex returns which time slot index (0-13) the current time falls into, or -1.
func GetCurrentSlotIndex(now time.Time) int {
	currentMinutes := now.Hour()*60 + now.Minute()

	slotMinutes := [][2]int{
		{480, 530},   // 08:00 - 08:50
		{530, 580},   // 08:50 - 09:40
		{580, 630},   // 09:40 - 10:30
		{630, 680},   // 10:30 - 11:20
		{680, 730},   // 11:20 - 12:10
		{730, 780},   // 12:10 - 13:00
		{780, 830},   // 13:00 - 13:50
		{830, 880},   // 13:50 - 14:40
		{880, 930},   // 14:40 - 15:30
		{930, 980},   // 15:30 - 16:20
		{980, 1030},  // 16:20 - 17:10
		{1030, 1080}, // 17:10 - 18:00
		{1080, 1130}, // 18:00 - 18:50
		{1130, 1180}, // 18:50 - 19:40
	}

	for i, sm := range slotMinutes {
		if currentMinutes >= sm[0] && currentMinutes < sm[1] {
			return i
		}
	}
	return -1
}
