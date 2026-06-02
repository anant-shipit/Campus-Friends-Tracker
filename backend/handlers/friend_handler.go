package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"campus-friends-tracker/backend/middleware"
	"campus-friends-tracker/backend/models"
	"campus-friends-tracker/backend/services"

	"github.com/gin-gonic/gin"
)

// GetFriends lists the authenticated user's friends with real-time status.
// GET /api/friends
func GetFriends(c *gin.Context) {
	userID := middleware.GetUserID(c)

	friends, err := services.ListUserFriends(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list friends"})
		return
	}

	if friends == nil {
		c.JSON(http.StatusOK, gin.H{"friends": []any{}})
		return
	}

	// Convert User friends to FriendStatus with live schedule info.
	statuses := getUserFriendStatuses(friends)
	c.JSON(http.StatusOK, gin.H{"friends": statuses})
}

// DeleteFriend removes a friendship.
// DELETE /api/friends/:id
func DeleteFriend(c *gin.Context) {
	userID := middleware.GetUserID(c)

	idStr := c.Param("id")
	friendID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid friend id"})
		return
	}

	if err := services.RemoveFriendship(userID, friendID); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove friend"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "friend removed"})
}

// GetFreeNow returns the authenticated user's friends who are currently free.
// GET /api/friends/free-now
func GetFreeNow(c *gin.Context) {
	userID := middleware.GetUserID(c)

	friends, err := services.ListUserFriends(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get friends"})
		return
	}

	statuses := getUserFriendStatuses(friends)
	var free []models.FriendStatus
	for _, s := range statuses {
		if s.CurrentStatus == "free" {
			free = append(free, s)
		}
	}
	if free == nil {
		free = []models.FriendStatus{}
	}
	c.JSON(http.StatusOK, gin.H{"friends": free})
}

// AcceptInvite creates a friendship via invite code.
// POST /api/friends/invite/:code
func AcceptInvite(c *gin.Context) {
	userID := middleware.GetUserID(c)
	code := c.Param("code")

	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invite code is required"})
		return
	}

	// Look up the user who owns this invite code.
	inviter, err := services.GetUserByInviteCode(code)
	if err != nil {
		if strings.Contains(err.Error(), "expired") {
			c.JSON(http.StatusGone, gin.H{"error": "this invite link has expired, ask your friend for a new one"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "invalid invite code"})
		return
	}

	if inviter.ID == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "you cannot add yourself as a friend"})
		return
	}

	// Check if already friends.
	already, err := services.AreFriends(userID, inviter.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check friendship"})
		return
	}
	if already {
		c.JSON(http.StatusConflict, gin.H{"error": "you are already friends", "friend": sanitizeUser(inviter)})
		return
	}

	// Create bidirectional friendship.
	if err := services.CreateFriendship(userID, inviter.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create friendship"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "friendship created!",
		"friend":  sanitizeUser(inviter),
	})
}

// GetInviteInfo returns the authenticated user's invite code and link.
// GET /api/friends/invite-info
func GetInviteInfo(c *gin.Context) {
	userID := middleware.GetUserID(c)

	user, err := services.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"inviteCode":      user.InviteCode,
		"expiresAt":       user.InviteCodeExpiresAt,
		"isExpired":       time.Now().After(user.InviteCodeExpiresAt),
	})
}

// RegenerateInvite creates a new invite code for the authenticated user.
// POST /api/friends/invite-regenerate
func RegenerateInvite(c *gin.Context) {
	userID := middleware.GetUserID(c)

	code, expiresAt, err := services.RegenerateInviteCode(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to regenerate invite code"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"inviteCode": code,
		"expiresAt":  expiresAt,
	})
}

// sanitizeUser removes sensitive fields from a User before sending to client.
func sanitizeUser(u *models.User) models.User {
	return models.User{
		ID:         u.ID,
		Email:      u.Email,
		Name:       u.Name,
		PictureURL: u.PictureURL,
		BatchCode:  u.BatchCode,
	}
}

// getUserFriendStatuses converts User-based friends to FriendStatus with live timetable data.
func getUserFriendStatuses(friends []models.User) []models.FriendStatus {
	loc, _ := time.LoadLocation("Asia/Kolkata")
	now := time.Now().In(loc)
	dayOfWeek := services.WeekdayToIndex(now.Weekday())

	statuses := make([]models.FriendStatus, 0, len(friends))

	for _, u := range friends {
		status := models.FriendStatus{
			Friend: models.Friend{
				ID:        u.ID,
				Name:      u.Name,
				BatchCode: batchCodeStr(u.BatchCode),
			},
			CurrentStatus: "free",
		}

		// If user has no batch or it's a weekend, they're free.
		if u.BatchCode == nil || *u.BatchCode == "" || dayOfWeek < 0 || dayOfWeek > 4 {
			statuses = append(statuses, status)
			continue
		}

		// Get today's schedule for this friend's batch.
		slots, err := services.GetDayScheduleByBatchCode(*u.BatchCode, dayOfWeek)
		if err != nil || len(slots) == 0 {
			statuses = append(statuses, status)
			continue
		}

		currentSlotIdx := services.GetCurrentSlotIndex(now)

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

func batchCodeStr(bc *string) string {
	if bc == nil {
		return ""
	}
	return *bc
}
