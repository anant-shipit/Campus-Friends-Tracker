package models

// Subject represents an academic subject/course.
type Subject struct {
	Code   string `json:"code"`
	Name   string `json:"name"`
	Credit string `json:"credit"`
	IsCore bool   `json:"isCore"`
}
