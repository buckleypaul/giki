package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// UserTheme represents a user-installed theme loaded from ~/.config/giki/themes/
type UserTheme struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	Author         string            `json:"author,omitempty"`
	Type           string            `json:"type"`
	HighlightTheme string            `json:"highlightTheme,omitempty"`
	Colors         map[string]string `json:"colors"`
}

// handleThemes handles GET /api/themes requests, returning user-installed themes.
func (s *Server) handleThemes(w http.ResponseWriter, r *http.Request) {
	dir := s.themesDir
	if dir == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode([]UserTheme{})
			return
		}
		dir = filepath.Join(homeDir, ".config", "giki", "themes")
	}

	themes := loadUserThemesFromDir(dir)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(themes); err != nil {
		log.Printf("Error encoding themes response: %v", err)
	}
}

func loadUserThemesFromDir(themesDir string) []UserTheme {
	entries, err := os.ReadDir(themesDir)
	if err != nil {
		return []UserTheme{}
	}

	var themes []UserTheme
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		theme, err := loadThemeFile(filepath.Join(themesDir, entry.Name()))
		if err != nil {
			continue
		}

		// Use filename as ID if not specified
		if theme.ID == "" {
			theme.ID = strings.TrimSuffix(entry.Name(), ".json")
		}

		themes = append(themes, *theme)
	}

	return themes
}

func loadThemeFile(path string) (*UserTheme, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var theme UserTheme
	if err := json.Unmarshal(data, &theme); err != nil {
		return nil, err
	}

	// Validate required fields
	if theme.Name == "" || theme.Type == "" || len(theme.Colors) == 0 {
		return nil, fmt.Errorf("missing required fields")
	}

	// Validate type
	if theme.Type != "light" && theme.Type != "dark" {
		return nil, fmt.Errorf("invalid type: %s", theme.Type)
	}

	return &theme, nil
}
