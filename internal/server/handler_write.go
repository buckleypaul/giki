package server

import (
	"encoding/json"
	"net/http"
)

// WriteRequest represents the JSON payload for POST /api/write
type WriteRequest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// DeleteRequest represents the JSON payload for POST /api/delete
type DeleteRequest struct {
	Path string `json:"path"`
}

// MoveRequest represents the JSON payload for POST /api/move
type MoveRequest struct {
	OldPath string `json:"oldPath"`
	NewPath string `json:"newPath"`
}

// SuccessResponse represents a generic success response
type SuccessResponse struct {
	Success bool `json:"success"`
}

// ErrorResponse represents a generic error response
type ErrorResponse struct {
	Error string `json:"error"`
}

// handleWrite handles POST /api/write requests.
// Writes content to a file at the specified path.
func (s *Server) handleWrite(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req WriteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "invalid request body"})
		return
	}

	// Validate path is not empty
	if req.Path == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "path cannot be empty"})
		return
	}

	// Write file to disk
	if err := s.provider.WriteFile(req.Path, []byte(req.Content)); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}

// handleDelete handles POST /api/delete requests.
// Deletes a file at the specified path.
func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req DeleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "invalid request body"})
		return
	}

	// Validate path is not empty
	if req.Path == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "path cannot be empty"})
		return
	}

	// Delete file from disk
	if err := s.provider.DeleteFile(req.Path); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}

// handleMove handles POST /api/move requests.
// Moves/renames a file from oldPath to newPath.
func (s *Server) handleMove(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req MoveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "invalid request body"})
		return
	}

	// Validate paths are not empty
	if req.OldPath == "" || req.NewPath == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "paths cannot be empty"})
		return
	}

	// Move file on disk
	if err := s.provider.MoveFile(req.OldPath, req.NewPath); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(SuccessResponse{Success: true})
}
