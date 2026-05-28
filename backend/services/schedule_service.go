package services

import (
	"context"
	"fmt"

	"campus-friends-tracker/backend/database"
	"campus-friends-tracker/backend/models"
)

// TimeSlot represents a free time window.
type TimeSlot struct {
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
	SlotIndex int    `json:"slotIndex"`
}

// GetDaySchedule returns all 14 slots for a batch on a given day.
func GetDaySchedule(batchID int, day int) ([]models.ScheduleSlot, error) {
	db := database.GetDB()
	ctx := context.Background()

	rows, err := db.Query(ctx,
		`SELECT id, batch_id, day_of_week, slot_index, 
		        start_time::text, end_time::text,
		        COALESCE(subject_code, ''), COALESCE(subject_name, ''),
		        class_type, COALESCE(room, ''), COALESCE(raw_text, '')
		 FROM schedule_slots
		 WHERE batch_id = $1 AND day_of_week = $2
		 ORDER BY slot_index`,
		batchID, day,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var slots []models.ScheduleSlot
	for rows.Next() {
		var s models.ScheduleSlot
		if err := rows.Scan(
			&s.ID, &s.BatchID, &s.DayOfWeek, &s.SlotIndex,
			&s.StartTime, &s.EndTime,
			&s.SubjectCode, &s.SubjectName,
			&s.ClassType, &s.Room, &s.RawText,
		); err != nil {
			return nil, err
		}
		slots = append(slots, s)
	}
	return slots, nil
}

// GetDayScheduleByBatchCode retrieves the schedule by batch code string.
func GetDayScheduleByBatchCode(batchCode string, day int) ([]models.ScheduleSlot, error) {
	db := database.GetDB()
	ctx := context.Background()

	var batchID int
	err := db.QueryRow(ctx, "SELECT id FROM batches WHERE code = $1", batchCode).Scan(&batchID)
	if err != nil {
		return nil, fmt.Errorf("batch %q not found: %w", batchCode, err)
	}

	return GetDaySchedule(batchID, day)
}

// GetCommonFreeSlots finds time slots where ALL given batches are free on a given day.
func GetCommonFreeSlots(batchCodes []string, day int) ([]TimeSlot, error) {
	if len(batchCodes) == 0 {
		return nil, nil
	}

	// Collect schedules for each batch.
	type slotKey struct {
		slotIndex int
	}

	// Track which slots have classes across all batches.
	busySlots := make(map[int]bool)

	for _, code := range batchCodes {
		slots, err := GetDayScheduleByBatchCode(code, day)
		if err != nil {
			return nil, fmt.Errorf("schedule for batch %s: %w", code, err)
		}
		for _, s := range slots {
			if s.ClassType != "free" {
				busySlots[s.SlotIndex] = true
			}
		}
	}

	// All 14 slots: those not busy for any batch are common free.
	var freeSlots []TimeSlot
	for i := 0; i < 14; i++ {
		if !busySlots[i] {
			freeSlots = append(freeSlots, TimeSlot{
				StartTime: timeSlots[i][0],
				EndTime:   timeSlots[i][1],
				SlotIndex: i,
			})
		}
	}

	return freeSlots, nil
}

// GetBatchIDForFriend returns the batch code for a friend.
func GetBatchIDForFriend(friendID int) (string, error) {
	db := database.GetDB()
	ctx := context.Background()

	var batchCode string
	err := db.QueryRow(ctx, "SELECT batch_code FROM friends WHERE id = $1", friendID).Scan(&batchCode)
	if err != nil {
		return "", fmt.Errorf("friend %d not found: %w", friendID, err)
	}
	return batchCode, nil
}
