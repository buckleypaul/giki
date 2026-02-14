package server

import (
	"encoding/json"
	"net/http"
)

// handleSearch handles GET /api/search requests for fuzzy filename and full-text search.
// Query parameters:
// - q: search query
// - type: "filename" or "content"
func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	// Extract query parameters
	query := r.URL.Query().Get("q")
	searchType := r.URL.Query().Get("type")

	// Validate search type
	if searchType != "filename" && searchType != "content" {
		http.Error(w, "invalid search type: must be 'filename' or 'content'", http.StatusBadRequest)
		return
	}

	// Perform search based on type
	var results interface{}
	var err error

	if searchType == "filename" {
		results, err = s.provider.SearchFileNames(query)
	} else {
		results, err = s.provider.SearchContent(query)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(results); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
		return
	}
}
