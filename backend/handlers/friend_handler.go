package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"campus-friends-tracker/backend/models"
	"campus-friends-tracker/backend/services"

	"github.com/gin-gonic/gin"
)

// addFriendRequest is the expected POST body for adding a friend.
type addFriendRequest struct {
	Name      string `json:"name" binding:"required"`
	BatchCode string `json:"batchCode" binding:"required"`
}

// GetFriends lists all friends with their current real-time status.
// GET /api/friends
func GetFriends(c *gin.Context) {
	friends, err := services.ListFriends()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list friends"})
		return
	}

	if friends == nil {
		c.JSON(http.StatusOK, gin.H{"friends": []any{}})
		return
	}

	statuses := services.GetFriendStatuses(friends)
	c.JSON(http.StatusOK, gin.H{"friends": statuses})
}

// AddFriend creates a new friend entry.
// POST /api/friends
func AddFriend(c *gin.Context) {
	var req addFriendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and batchCode are required"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.BatchCode = strings.TrimSpace(req.BatchCode)

	if req.Name == "" || req.BatchCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and batchCode cannot be empty"})
		return
	}

	friend, err := services.AddFriend(req.Name, req.BatchCode)
	if err != nil {
		if strings.Contains(err.Error(), "does not exist") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add friend"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"friend": friend})
}

// DeleteFriend removes a friend by ID.
// DELETE /api/friends/:id
func DeleteFriend(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid friend id"})
		return
	}

	if err := services.DeleteFriend(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete friend"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "friend deleted"})
}

// GetFreeNow returns friends who are currently free.
// GET /api/friends/free-now
func GetFreeNow(c *gin.Context) {
	free, err := services.GetFreeNowFriends()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get free friends"})
		return
	}
	if free == nil {
		free = []models.FriendStatus{}
	}
	c.JSON(http.StatusOK, gin.H{"friends": free})
}
