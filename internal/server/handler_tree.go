package server

import (
	"encoding/json"
	"net/http"
)

// handleTree handles GET /api/tree requests.
// Returns the file tree for the specified branch (defaults to current branch).
// Respects .gitignore rules and sorts directories before files.
func (s *Server) handleTree(w http.ResponseWriter, r *http.Request) {
	// Get branch from query parameter (empty string uses current branch)
	branch := r.URL.Query().Get("branch")

	// Get tree from provider
	tree, err := s.provider.Tree(branch)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Return as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(tree); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
