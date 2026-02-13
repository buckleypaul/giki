package server

import (
	"encoding/json"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
)

// handleFile handles GET /api/file/<path>?branch=<branch>
// Returns raw file content with appropriate Content-Type header.
// Returns 404 JSON error for missing files.
func (s *Server) handleFile(w http.ResponseWriter, r *http.Request) {
	// Extract path from URL (everything after /api/file/)
	path := strings.TrimPrefix(r.URL.Path, "/api/file/")
	path = strings.Trim(path, "/")

	// Get branch from query parameter (empty string uses current branch)
	branch := r.URL.Query().Get("branch")

	// Get file content from provider
	content, err := s.provider.FileContent(path, branch)
	if err != nil {
		// Check if it's a "file not found" error
		if strings.Contains(err.Error(), "file not found") || strings.Contains(err.Error(), "path is a directory") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{
				"error": err.Error(),
			})
			return
		}

		// Other errors are internal server errors
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Determine Content-Type
	contentType := detectContentType(path, content)

	// Set headers and return content
	w.Header().Set("Content-Type", contentType)
	w.Write(content)
}

// detectContentType determines the Content-Type for a file.
// Uses mime.TypeByExtension first, falls back to http.DetectContentType.
func detectContentType(path string, content []byte) string {
	// Try extension-based detection first
	ext := filepath.Ext(path)
	if ext != "" {
		mimeType := mime.TypeByExtension(ext)
		if mimeType != "" {
			return mimeType
		}
	}

	// Fallback to content-based detection (uses file magic bytes)
	return http.DetectContentType(content)
}
