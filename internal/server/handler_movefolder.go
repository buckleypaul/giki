package server

import (
	"encoding/json"
	"net/http"
)

// MoveFolderRequest is the request body for POST /api/move-folder.
type MoveFolderRequest struct {
	OldPath string `json:"oldPath"`
	NewPath string `json:"newPath"`
}

// handleMoveFolder moves a folder from oldPath to newPath.
func (s *Server) handleMoveFolder(w http.ResponseWriter, r *http.Request) {
	var req MoveFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.OldPath == "" || req.NewPath == "" {
		http.Error(w, "oldPath and newPath are required", http.StatusBadRequest)
		return
	}

	if err := s.provider.MoveFolder(req.OldPath, req.NewPath); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
