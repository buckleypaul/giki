package server

import (
	"encoding/json"
	"net/http"
)

// handleBranches handles GET /api/branches requests.
// Returns a JSON array of all branches in the repository.
// The current HEAD branch is marked with isDefault: true.
func (s *Server) handleBranches(w http.ResponseWriter, r *http.Request) {
	// Get branches from provider
	branches, err := s.provider.Branches()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(branches); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
