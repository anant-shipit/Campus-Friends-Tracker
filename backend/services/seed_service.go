package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strings"

	"campus-friends-tracker/backend/data"
	"campus-friends-tracker/backend/database"

	"github.com/jackc/pgx/v5"
)

// Fixed 14 time slots (50 minutes each).
var timeSlots = [14][2]string{
	{"08:00", "08:50"},
	{"08:50", "09:40"},
	{"09:40", "10:30"},
	{"10:30", "11:20"},
	{"11:20", "12:10"},
	{"12:10", "13:00"},
	{"13:00", "13:50"},
	{"13:50", "14:40"},
	{"14:40", "15:30"},
	{"15:30", "16:20"},
	{"16:20", "17:10"},
	{"17:10", "18:00"},
	{"18:00", "18:50"},
	{"18:50", "19:40"},
}

// subjectJSON matches the structure in subjects.json.
type subjectJSON struct {
	Sno         string `json:"sno"`
	Name        string `json:"name"`
	SubjectCode string `json:"subjectCode"`
	Credit      string `json:"credit"`
	IsCore      string `json:"isCore"`
}

// cellJSON matches a single cell in the timetable grid.
type cellJSON struct {
	Course string `json:"course"`
	Type   string `json:"type"`
	Room   string `json:"Room"`
	Color  string `json:"color"`
}

// SeedDatabase loads subjects and timetable data from embedded JSON files
// and populates the database. The operation is idempotent.
func SeedDatabase() error {
	log.Println("🌱 Starting database seed...")

	subjectCodes, err := seedSubjects()
	if err != nil {
		return fmt.Errorf("seed subjects: %w", err)
	}

	if err := seedTimetable(subjectCodes); err != nil {
		return fmt.Errorf("seed timetable: %w", err)
	}

	log.Println("✅ Database seeded successfully")
	return nil
}

// seedSubjects reads subjects.json and inserts all subjects.
func seedSubjects() (map[string]string, error) {
	raw, err := data.EmbeddedData.ReadFile("subjects.json")
	if err != nil {
		return nil, fmt.Errorf("read subjects.json: %w", err)
	}

	var subjects map[string]subjectJSON
	if err := json.Unmarshal(raw, &subjects); err != nil {
		return nil, fmt.Errorf("parse subjects.json: %w", err)
	}

	db := database.GetDB()
	ctx := context.Background()

	// Collect subject codes → names for later timetable parsing.
	codeToName := make(map[string]string, len(subjects))

	// Batch insert using a single transaction.
	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	batch := &pgx.Batch{}
	for code, s := range subjects {
		isCore := strings.EqualFold(s.IsCore, "true")
		codeToName[code] = s.Name

		batch.Queue(
			`INSERT INTO subjects (code, name, credit, is_core)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (code) DO UPDATE SET
			   name = EXCLUDED.name,
			   credit = EXCLUDED.credit,
			   is_core = EXCLUDED.is_core`,
			code, s.Name, s.Credit, isCore,
		)
	}
	br := tx.SendBatch(ctx, batch)
	for range subjects {
		if _, err := br.Exec(); err != nil {
			br.Close()
			return nil, fmt.Errorf("batch insert subjects: %w", err)
		}
	}
	if err := br.Close(); err != nil {
		return nil, fmt.Errorf("close subjects batch: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	log.Printf("  📚 Inserted %d subjects", len(subjects))
	return codeToName, nil
}

// seedTimetable reads data.json and inserts batches + schedule slots.
func seedTimetable(subjectCodes map[string]string) error {
	raw, err := data.EmbeddedData.ReadFile("data.json")
	if err != nil {
		return fmt.Errorf("read data.json: %w", err)
	}

	// Structure: { "yearGroup": { "batchCode": [ [cells...], ... ] } }
	var timetable map[string]map[string][][]cellJSON
	if err := json.Unmarshal(raw, &timetable); err != nil {
		return fmt.Errorf("parse data.json: %w", err)
	}

	db := database.GetDB()
	ctx := context.Background()

	// Truncate schedule_slots and batches for idempotency, then re-insert.
	_, err = db.Exec(ctx, "DELETE FROM schedule_slots")
	if err != nil {
		return fmt.Errorf("truncate schedule_slots: %w", err)
	}
	_, err = db.Exec(ctx, "DELETE FROM batches")
	if err != nil {
		return fmt.Errorf("truncate batches: %w", err)
	}

	totalBatches := 0
	totalSlots := 0

	validBatchRegex := regexp.MustCompile(`^\d[A-Z0-9]+$`)

	for yearGroup, batches := range timetable {
		yearBatches := 0
		yearSlots := 0
		for batchCode, grid := range batches {
			if !validBatchRegex.MatchString(batchCode) {
				continue
			}
			
			// Insert batch.
			var batchID int
			err := db.QueryRow(ctx,
				`INSERT INTO batches (code, year_group) VALUES ($1, $2)
				 ON CONFLICT (code) DO UPDATE SET year_group = EXCLUDED.year_group
				 RETURNING id`,
				batchCode, yearGroup,
			).Scan(&batchID)
			if err != nil {
				return fmt.Errorf("insert batch %s: %w", batchCode, err)
			}
			totalBatches++
			yearBatches++

			// Grid: row 0 = header, rows 1-14 = time slots.
			// Columns: 0 = time label, 1-5 = Mon-Fri.
			if len(grid) < 2 {
				continue
			}

			// Batch insert schedule slots in a transaction.
			tx, err := db.Begin(ctx)
			if err != nil {
				return err
			}
			slotBatch := &pgx.Batch{}
			slotsQueued := 0

			// Keep track of the last subject for each day
			var lastSlot [5]parsedSlot

			for rowIdx := 1; rowIdx < len(grid) && rowIdx <= 14; rowIdx++ {
				row := grid[rowIdx]
				slotIndex := rowIdx - 1

				for colIdx := 1; colIdx < len(row) && colIdx <= 5; colIdx++ {
					dayOfWeek := colIdx - 1
					cell := row[colIdx]

					courseText := strings.TrimSpace(cell.Course)
					parsed := parseCell(cell, subjectCodes)

					if parsed.classType != "free" && parsed.subjectName == "" {
						if lastSlot[dayOfWeek].subjectName != "" {
							parsed.subjectName = lastSlot[dayOfWeek].subjectName
							parsed.subjectCode = lastSlot[dayOfWeek].subjectCode
							parsed.classType = lastSlot[dayOfWeek].classType
							if parsed.room == "" || strings.HasPrefix(courseText, "LAB") {
								parsed.room = lastSlot[dayOfWeek].room
							}
						}
					}
					lastSlot[dayOfWeek] = parsed

					slotBatch.Queue(
						`INSERT INTO schedule_slots
						 (batch_id, day_of_week, slot_index, start_time, end_time,
						  subject_code, subject_name, class_type, room, raw_text)
						 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
						 ON CONFLICT (batch_id, day_of_week, slot_index) DO UPDATE SET
						   subject_code = EXCLUDED.subject_code,
						   subject_name = EXCLUDED.subject_name,
						   class_type = EXCLUDED.class_type,
						   room = EXCLUDED.room,
						   raw_text = EXCLUDED.raw_text`,
						batchID, dayOfWeek, slotIndex,
						timeSlots[slotIndex][0], timeSlots[slotIndex][1],
						nilIfEmpty(parsed.subjectCode), nilIfEmpty(parsed.subjectName),
						parsed.classType,
						nilIfEmpty(parsed.room), nilIfEmpty(courseText),
					)
					slotsQueued++
				}
			}

			br := tx.SendBatch(ctx, slotBatch)
			for i := 0; i < slotsQueued; i++ {
				if _, err := br.Exec(); err != nil {
					br.Close()
					if rbErr := tx.Rollback(ctx); rbErr != nil {
						log.Printf("rollback failed for batch=%s: %v", batchCode, rbErr)
					}
					return fmt.Errorf("insert slots batch=%s: %w", batchCode, err)
				}
			}
			br.Close()
			totalSlots += slotsQueued
			yearSlots += slotsQueued

			if err := tx.Commit(ctx); err != nil {
				return err
			}
		}
		log.Printf("    📅 %s: %d batches, %d slots inserted", yearGroup, yearBatches, yearSlots)
	}

	log.Printf("  📅 Inserted %d batches, %d schedule slots", totalBatches, totalSlots)
	return nil
}

type parsedSlot struct {
	subjectCode string
	subjectName string
	classType   string
	room        string
}

// parseCell interprets a timetable cell from the new JSON format.
func parseCell(cell cellJSON, subjectCodes map[string]string) parsedSlot {
	courseCode := strings.TrimSpace(cell.Course)
	if courseCode == "" {
		return parsedSlot{classType: "free"}
	}

	result := parsedSlot{
		classType: "other",
		room:      strings.TrimSpace(cell.Room),
	}

	// Determine class type based on cell.Type
	switch strings.TrimSpace(cell.Type) {
	case "L":
		result.classType = "lecture"
	case "T":
		result.classType = "tutorial"
	case "P":
		result.classType = "lab"
	}

	// Try to match the exact course code to get the subject name
	if name, ok := subjectCodes[courseCode]; ok {
		result.subjectCode = courseCode
		result.subjectName = name
		return result
	}

	// Check for "PROFESSIONAL COMMUNICATION" special case
	if strings.HasPrefix(courseCode, "PROFESSIONAL COMMUNICATION") {
		result.subjectCode = "UHU003"
		result.subjectName = "PROFESSIONAL COMMUNICATION"
		// Fallback to color if type is missing
		if result.classType == "other" {
			switch cell.Color {
			case "danger":
				result.classType = "lecture"
			case "primary":
				result.classType = "tutorial"
			default:
				result.classType = "tutorial"
			}
		}
		return result
	}

	// Some labs are just named "LAB" in the course field
	if strings.HasPrefix(courseCode, "LAB") {
		result.classType = "lab"
		return result
	}

	return result
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
