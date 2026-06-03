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
	Color  string `json:"color"`
}

// roomPattern matches typical room codes like LP101, T204, F302, G310, CAD-1, W/SHOP, LC27, C309.
var roomPattern = regexp.MustCompile(`^[A-Z][A-Za-z0-9/\-]+[0-9A-Z]$|^W/SHOP$|^CAD-\d+$`)

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

	for code, s := range subjects {
		isCore := strings.EqualFold(s.IsCore, "true")
		codeToName[code] = s.Name

		_, err := tx.Exec(ctx,
			`INSERT INTO subjects (code, name, credit, is_core)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (code) DO UPDATE SET
			   name = EXCLUDED.name,
			   credit = EXCLUDED.credit,
			   is_core = EXCLUDED.is_core`,
			code, s.Name, s.Credit, isCore,
		)
		if err != nil {
			return nil, fmt.Errorf("insert subject %s: %w", code, err)
		}
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

	for yearGroup, batches := range timetable {
		for batchCode, grid := range batches {
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

			for rowIdx := 1; rowIdx < len(grid) && rowIdx <= 14; rowIdx++ {
				row := grid[rowIdx]
				slotIndex := rowIdx - 1

				for colIdx := 1; colIdx < len(row) && colIdx <= 5; colIdx++ {
					dayOfWeek := colIdx - 1
					cell := row[colIdx]

					courseText := strings.TrimSpace(cell.Course)
					color := cell.Color

					parsed := parseCell(courseText, color, subjectCodes)

					_, err := tx.Exec(ctx,
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
					if err != nil {
						if rbErr := tx.Rollback(ctx); rbErr != nil {
							log.Printf("rollback failed for batch=%s: %v", batchCode, rbErr)
						}
						return fmt.Errorf("insert slot batch=%s day=%d slot=%d: %w",
							batchCode, dayOfWeek, slotIndex, err)
					}
					totalSlots++
				}
			}

			if err := tx.Commit(ctx); err != nil {
				return err
			}
		}
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

// parseCell interprets a timetable cell's course text and color.
func parseCell(course, color string, subjectCodes map[string]string) parsedSlot {
	if course == "" {
		return parsedSlot{classType: "free"}
	}

	result := parsedSlot{classType: "other"}

	// Try to match a known subject code with type indicator (e.g., "UMA023 L LP101").
	tokens := strings.Fields(course)

	// Check for "PROFESSIONAL COMMUNICATION" pattern.
	if strings.HasPrefix(course, "PROFESSIONAL COMMUNICATION") {
		result.subjectCode = "UHU003"
		result.subjectName = "PROFESSIONAL COMMUNICATION"

		// Determine type from color: danger → lecture, primary → tutorial, else → tutorial.
		switch color {
		case "danger":
			result.classType = "lecture"
		case "primary":
			result.classType = "tutorial"
		default:
			result.classType = "tutorial"
		}

		// Extract room from remaining tokens.
		for _, tok := range tokens[2:] { // Skip "PROFESSIONAL" and "COMMUNICATION"
			if isRoomCode(tok) {
				result.room = tok
			}
		}
		return result
	}

	// Check for subject code pattern: CODE TYPE ROOM
	if len(tokens) >= 2 {
		potentialCode := tokens[0]
		if name, ok := subjectCodes[potentialCode]; ok {
			result.subjectCode = potentialCode
			result.subjectName = name

			// Check type indicator.
			if len(tokens) >= 2 {
				switch tokens[1] {
				case "L":
					result.classType = "lecture"
				case "T":
					result.classType = "tutorial"
				case "P":
					result.classType = "lab"
				default:
					result.classType = "other"
				}
			}

			// Extract room (usually last token that looks like a room code).
			for i := len(tokens) - 1; i >= 2; i-- {
				if isRoomCode(tokens[i]) {
					result.room = tokens[i]
					break
				}
			}
			return result
		}
	}

	// Check for "LAB" prefix patterns (e.g., "LAB LC27", "LAB NK", "LAB-1 LC17").
	if strings.HasPrefix(course, "LAB") {
		result.classType = "lab"
		// Extract room from remaining tokens.
		for i := len(tokens) - 1; i >= 0; i-- {
			if isRoomCode(tokens[i]) && !strings.HasPrefix(tokens[i], "LAB") {
				result.room = tokens[i]
				break
			}
		}
		return result
	}

	// Catch-all: could be entries like "NK 4:20 pm", "SAT NK", "DMG ..." etc.
	result.classType = "other"
	for i := len(tokens) - 1; i >= 0; i-- {
		if isRoomCode(tokens[i]) {
			result.room = tokens[i]
			break
		}
	}
	return result
}

// isRoomCode checks whether a token looks like a room/venue code.
func isRoomCode(tok string) bool {
	if len(tok) < 2 {
		return false
	}
	return roomPattern.MatchString(tok)
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
