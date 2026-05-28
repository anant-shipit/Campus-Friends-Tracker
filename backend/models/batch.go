package models

// Batch represents a student batch/section.
type Batch struct {
	ID        int    `json:"id"`
	Code      string `json:"code"`
	YearGroup string `json:"yearGroup"`
}
