package handlers

import (
	"log"
	"net/http"

	"campus-friends-tracker/backend/database"

	"github.com/gin-gonic/gin"
)

// scheduleSlotJSON is a flat JSON representation for the frontend cache.
type scheduleSlotJSON struct {
	SlotIndex   int    `json:"slotIndex"`
	StartTime   string `json:"startTime"`
	EndTime     string `json:"endTime"`
	SubjectCode string `json:"subjectCode,omitempty"`
	SubjectName string `json:"subjectName,omitempty"`
	ClassType   string `json:"classType"`
	Room        string `json:"room,omitempty"`
}

// SeedChecker reports whether a database seed is currently in progress.
// Returns (running, failed, errorMessage).
type SeedChecker func() (bool, bool, string)

// MakeGetAllSchedules returns a handler that gates on the seed state.
// If a seed is running, it returns 503 so the frontend keeps its cache
// instead of overwriting it with empty data.
func MakeGetAllSchedules(checkSeed SeedChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Gate: refuse to serve during seed to prevent empty-data caching.
		if checkSeed != nil {
			running, _, _ := checkSeed()
			if running {
				c.JSON(http.StatusServiceUnavailable, gin.H{
					"error": "database seed in progress, please retry shortly",
				})
				return
			}
		}

		getAllSchedules(c)
	}
}

// GetAllSchedules is the ungated version (used when --seed is not passed).
func GetAllSchedules(c *gin.Context) {
	getAllSchedules(c)
}

// getAllSchedules returns the entire timetable for every batch, grouped by
// batch code → day index → slots.  The frontend caches this once for offline use.
func getAllSchedules(c *gin.Context) {
	db := database.GetDB()
	ctx := c.Request.Context()

	// Query all schedule slots joined with batch code.
	rows, err := db.Query(ctx, `
		SELECT b.code, ss.day_of_week, ss.slot_index,
		       ss.start_time::text, ss.end_time::text,
		       COALESCE(ss.subject_code, ''), COALESCE(ss.subject_name, ''),
		       ss.class_type, COALESCE(ss.room, '')
		FROM schedule_slots ss
		JOIN batches b ON b.id = ss.batch_id
		ORDER BY b.code, ss.day_of_week, ss.slot_index
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query schedules"})
		return
	}
	defer rows.Close()

	// Build nested map: batchCode → dayIndex → []slot
	timetable := make(map[string]map[int][]scheduleSlotJSON)

	for rows.Next() {
		var code string
		var dayOfWeek, slotIndex int
		var startTime, endTime, subjectCode, subjectName, classType, room string

		if err := rows.Scan(&code, &dayOfWeek, &slotIndex,
			&startTime, &endTime,
			&subjectCode, &subjectName,
			&classType, &room); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan schedule"})
			return
		}

		if timetable[code] == nil {
			timetable[code] = make(map[int][]scheduleSlotJSON)
		}

		timetable[code][dayOfWeek] = append(timetable[code][dayOfWeek], scheduleSlotJSON{
			SlotIndex:   slotIndex,
			StartTime:   startTime,
			EndTime:     endTime,
			SubjectCode: subjectCode,
			SubjectName: subjectName,
			ClassType:   classType,
			Room:        room,
		})
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating schedule rows: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to iterate schedules"})
		return
	}

	// Also include a flat sorted list of batch codes for the AddFriendModal dropdown.
	batchRows, err := db.Query(ctx, "SELECT DISTINCT code FROM batches ORDER BY code")
	if err != nil {
		log.Printf("Error querying batches: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query batches"})
		return
	}
	defer batchRows.Close()

	batches := []string{}
	for batchRows.Next() {
		var code string
		if err := batchRows.Scan(&code); err != nil {
			log.Printf("Error scanning batch row: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan batch details"})
			return
		}
		batches = append(batches, code)
	}

	if err := batchRows.Err(); err != nil {
		log.Printf("Error iterating batch rows: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to iterate batches"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"timetable": timetable,
		"batches":   batches,
	})
}

