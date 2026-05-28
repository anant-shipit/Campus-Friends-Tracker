package handlers

import (
	"context"
	"net/http"

	"campus-friends-tracker/backend/database"

	"github.com/gin-gonic/gin"
)

// batchGroup groups batches by year for the response.
type batchGroup struct {
	YearGroup string   `json:"yearGroup"`
	Batches   []string `json:"batches"`
}

// GetBatches returns all batches grouped by year_group.
// GET /api/batches
func GetBatches(c *gin.Context) {
	db := database.GetDB()
	ctx := context.Background()

	rows, err := db.Query(ctx,
		"SELECT code, year_group FROM batches ORDER BY year_group, code")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query batches"})
		return
	}
	defer rows.Close()

	groupMap := make(map[string][]string)
	var order []string

	for rows.Next() {
		var code, yearGroup string
		if err := rows.Scan(&code, &yearGroup); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan batch"})
			return
		}

		if _, exists := groupMap[yearGroup]; !exists {
			order = append(order, yearGroup)
		}
		groupMap[yearGroup] = append(groupMap[yearGroup], code)
	}

	groups := make([]batchGroup, 0, len(order))
	for _, yg := range order {
		groups = append(groups, batchGroup{
			YearGroup: yg,
			Batches:   groupMap[yg],
		})
	}

	c.JSON(http.StatusOK, gin.H{"groups": groups})
}
