package server

import (
	"encoding/json"
	"net/http"
)

// CommitRequest represents the JSON payload for POST /api/commit
type CommitRequest struct {
	Message string `json:"message"`
}

// CommitResponse represents the response from POST /api/commit
type CommitResponse struct {
	Hash string `json:"hash"`
}

// handleCommit handles POST /api/commit requests.
// Creates a git commit with all staged and unstaged changes.
func (s *Server) handleCommit(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req CommitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "invalid request body"})
		return
	}

	// Validate message is not empty
	if req.Message == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "commit message cannot be empty"})
		return
	}

	// Create commit
	hash, err := s.provider.Commit(req.Message)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	// Return commit hash
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CommitResponse{Hash: hash})
}
