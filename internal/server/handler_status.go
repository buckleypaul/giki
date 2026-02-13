package server

import (
	"encoding/json"
	"net/http"
)

// handleStatus handles GET /api/status requests.
// Returns the current repository status including source, branch, and dirty state.
func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	// Get repository status
	status, err := s.provider.Status()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(status); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
