package handlers

import (
	"net/http"
	"strconv"
	"time"

	"campus-friends-tracker/backend/middleware"
	"campus-friends-tracker/backend/services"

	"github.com/gin-gonic/gin"
)

// GetFriendSchedule returns the full day schedule for a friend's batch.
// The requested friend must be in the authenticated user's friend list.
// GET /api/friends/:id/schedule?day=0
func GetFriendSchedule(c *gin.Context) {
	userID := middleware.GetUserID(c)

	idStr := c.Param("id")
	friendID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid friend id"})
		return
	}

	// Validate friendship.
	areFriends, err := services.AreFriends(userID, friendID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify friendship"})
		return
	}
	if !areFriends {
		c.JSON(http.StatusForbidden, gin.H{"error": "this user is not in your friend list"})
		return
	}

	// Get the friend's user record to find their batch.
	friend, err := services.GetUserByID(friendID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "friend not found"})
		return
	}

	if friend.BatchCode == nil || *friend.BatchCode == "" {
		c.JSON(http.StatusOK, gin.H{
			"batchCode": "",
			"day":       0,
			"dayName":   "Monday",
			"slots":     []any{},
			"message":   "this friend has not set their batch yet",
		})
		return
	}

	batchCode := *friend.BatchCode

	// Parse day parameter, default to today.
	dayStr := c.DefaultQuery("day", "")
	var day int
	if dayStr == "" {
		loc, _ := time.LoadLocation("Asia/Kolkata")
		now := time.Now().In(loc)
		wd := now.Weekday()
		switch wd {
		case time.Monday:
			day = 0
		case time.Tuesday:
			day = 1
		case time.Wednesday:
			day = 2
		case time.Thursday:
			day = 3
		case time.Friday:
			day = 4
		default:
			day = 0 // Default to Monday on weekends
		}
	} else {
		day, err = strconv.Atoi(dayStr)
		if err != nil || day < 0 || day > 4 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "day must be 0-4 (Mon-Fri)"})
			return
		}
	}

	slots, err := services.GetDayScheduleByBatchCode(batchCode, day)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get schedule"})
		return
	}

	dayNames := []string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}
	c.JSON(http.StatusOK, gin.H{
		"batchCode": batchCode,
		"day":       day,
		"dayName":   dayNames[day],
		"slots":     slots,
	})
}

// commonFreeRequest is the POST body for finding common free slots.
type commonFreeRequest struct {
	FriendIDs []int `json:"friendIds" binding:"required"`
	Day       *int  `json:"day"`
}

// GetCommonFreeSlots finds time slots where all specified friends are free.
// All friend IDs must be in the authenticated user's friend list.
// POST /api/friends/common-free
func GetCommonFreeSlots(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req commonFreeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "friendIds array is required"})
		return
	}

	if len(req.FriendIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "friendIds cannot be empty"})
		return
	}

	// Validate all friends belong to this user.
	for _, fid := range req.FriendIDs {
		areFriends, err := services.AreFriends(userID, fid)
		if err != nil || !areFriends {
			c.JSON(http.StatusForbidden, gin.H{
				"error":    "one or more users are not in your friend list",
				"friendId": fid,
			})
			return
		}
	}

	// Determine the day.
	var day int
	if req.Day != nil {
		day = *req.Day
		if day < 0 || day > 4 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "day must be 0-4 (Mon-Fri)"})
			return
		}
	} else {
		loc, _ := time.LoadLocation("Asia/Kolkata")
		now := time.Now().In(loc)
		wd := now.Weekday()
		switch wd {
		case time.Monday:
			day = 0
		case time.Tuesday:
			day = 1
		case time.Wednesday:
			day = 2
		case time.Thursday:
			day = 3
		case time.Friday:
			day = 4
		default:
			day = 0
		}
	}

	// Collect batch codes for all friends (skip those without a batch).
	var batchCodes []string
	for _, fid := range req.FriendIDs {
		friend, err := services.GetUserByID(fid)
		if err != nil {
			continue
		}
		if friend.BatchCode != nil && *friend.BatchCode != "" {
			batchCodes = append(batchCodes, *friend.BatchCode)
		}
	}

	// Also include the requesting user's batch if they have one.
	me, err := services.GetUserByID(userID)
	if err == nil && me.BatchCode != nil && *me.BatchCode != "" {
		batchCodes = append(batchCodes, *me.BatchCode)
	}

	freeSlots, err := services.GetCommonFreeSlots(batchCodes, day)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute common free slots"})
		return
	}

	if freeSlots == nil {
		freeSlots = []services.TimeSlot{}
	}

	dayNames := []string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}
	c.JSON(http.StatusOK, gin.H{
		"day":       day,
		"dayName":   dayNames[day],
		"freeSlots": freeSlots,
	})
}
