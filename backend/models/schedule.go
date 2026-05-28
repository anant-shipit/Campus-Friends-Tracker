package models

// ScheduleSlot represents a single class slot in a batch's weekly timetable.
type ScheduleSlot struct {
	ID          int    `json:"id"`
	BatchID     int    `json:"batchId"`
	DayOfWeek   int    `json:"dayOfWeek"`
	SlotIndex   int    `json:"slotIndex"`
	StartTime   string `json:"startTime"`
	EndTime     string `json:"endTime"`
	SubjectCode string `json:"subjectCode,omitempty"`
	SubjectName string `json:"subjectName,omitempty"`
	ClassType   string `json:"classType"`
	Room        string `json:"room,omitempty"`
	RawText     string `json:"rawText,omitempty"`
}
