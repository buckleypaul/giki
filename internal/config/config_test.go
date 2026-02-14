package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadFrom_FileDoesNotExist(t *testing.T) {
	cfg, err := LoadFrom("/nonexistent/path/config.toml")
	if err != nil {
		t.Fatalf("LoadFrom should not error on missing file: %v", err)
	}
	if cfg.GitHubToken != "" || cfg.GitLabToken != "" {
		t.Error("Empty config should have no tokens")
	}
}

func TestLoadFrom_ValidTOML(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.toml")

	content := `
github_token = "gh_test_token_123"
gitlab_token = "gl_test_token_456"
`
	if err := os.WriteFile(configPath, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to write test config: %v", err)
	}

	cfg, err := LoadFrom(configPath)
	if err != nil {
		t.Fatalf("LoadFrom failed: %v", err)
	}

	if cfg.GitHubToken != "gh_test_token_123" {
		t.Errorf("Expected GitHubToken 'gh_test_token_123', got '%s'", cfg.GitHubToken)
	}
	if cfg.GitLabToken != "gl_test_token_456" {
		t.Errorf("Expected GitLabToken 'gl_test_token_456', got '%s'", cfg.GitLabToken)
	}
}

func TestLoadFrom_InvalidTOML(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.toml")

	content := `this is not valid toml = [ { `
	if err := os.WriteFile(configPath, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to write test config: %v", err)
	}

	_, err := LoadFrom(configPath)
	if err == nil {
		t.Error("LoadFrom should error on invalid TOML")
	}
}

func TestResolveGitHubToken_CLITakesPrecedence(t *testing.T) {
	// Set environment variable
	os.Setenv("GIKI_GITHUB_TOKEN", "env_token")
	defer os.Unsetenv("GIKI_GITHUB_TOKEN")

	cfg := &Config{
		GitHubToken: "config_token",
	}

	// CLI flag should win
	resolved := cfg.ResolveGitHubToken("cli_token")
	if resolved.Value != "cli_token" {
		t.Errorf("Expected 'cli_token', got '%s'", resolved.Value)
	}
	if resolved.Source != TokenSourceCLI {
		t.Errorf("Expected source CLI, got %s", resolved.Source)
	}
}

func TestResolveGitHubToken_ConfigTakesPrecedenceOverEnv(t *testing.T) {
	// Set environment variable
	os.Setenv("GIKI_GITHUB_TOKEN", "env_token")
	defer os.Unsetenv("GIKI_GITHUB_TOKEN")

	cfg := &Config{
		GitHubToken: "config_token",
	}

	// Config should win over env (no CLI flag)
	resolved := cfg.ResolveGitHubToken("")
	if resolved.Value != "config_token" {
		t.Errorf("Expected 'config_token', got '%s'", resolved.Value)
	}
	if resolved.Source != TokenSourceConfig {
		t.Errorf("Expected source Config, got %s", resolved.Source)
	}
}

func TestResolveGitHubToken_EnvIsUsedAsLastResort(t *testing.T) {
	// Set environment variable
	os.Setenv("GIKI_GITHUB_TOKEN", "env_token")
	defer os.Unsetenv("GIKI_GITHUB_TOKEN")

	cfg := &Config{
		// No config token
	}

	// Env should be used (no CLI flag, no config)
	resolved := cfg.ResolveGitHubToken("")
	if resolved.Value != "env_token" {
		t.Errorf("Expected 'env_token', got '%s'", resolved.Value)
	}
	if resolved.Source != TokenSourceEnv {
		t.Errorf("Expected source Env, got %s", resolved.Source)
	}
}

func TestResolveGitHubToken_NoneWhenNoTokens(t *testing.T) {
	// Ensure no env var
	os.Unsetenv("GIKI_GITHUB_TOKEN")

	cfg := &Config{
		// No config token
	}

	// Should return empty with source None
	resolved := cfg.ResolveGitHubToken("")
	if resolved.Value != "" {
		t.Errorf("Expected empty token, got '%s'", resolved.Value)
	}
	if resolved.Source != TokenSourceNone {
		t.Errorf("Expected source None, got %s", resolved.Source)
	}
}

func TestResolveGitLabToken_CLITakesPrecedence(t *testing.T) {
	// Set environment variable
	os.Setenv("GIKI_GITLAB_TOKEN", "env_token")
	defer os.Unsetenv("GIKI_GITLAB_TOKEN")

	cfg := &Config{
		GitLabToken: "config_token",
	}

	// CLI flag should win
	resolved := cfg.ResolveGitLabToken("cli_token")
	if resolved.Value != "cli_token" {
		t.Errorf("Expected 'cli_token', got '%s'", resolved.Value)
	}
	if resolved.Source != TokenSourceCLI {
		t.Errorf("Expected source CLI, got %s", resolved.Source)
	}
}

func TestResolveGitLabToken_ConfigTakesPrecedenceOverEnv(t *testing.T) {
	// Set environment variable
	os.Setenv("GIKI_GITLAB_TOKEN", "env_token")
	defer os.Unsetenv("GIKI_GITLAB_TOKEN")

	cfg := &Config{
		GitLabToken: "config_token",
	}

	// Config should win over env (no CLI flag)
	resolved := cfg.ResolveGitLabToken("")
	if resolved.Value != "config_token" {
		t.Errorf("Expected 'config_token', got '%s'", resolved.Value)
	}
	if resolved.Source != TokenSourceConfig {
		t.Errorf("Expected source Config, got %s", resolved.Source)
	}
}

func TestResolveGitLabToken_EnvIsUsedAsLastResort(t *testing.T) {
	// Set environment variable
	os.Setenv("GIKI_GITLAB_TOKEN", "env_token")
	defer os.Unsetenv("GIKI_GITLAB_TOKEN")

	cfg := &Config{
		// No config token
	}

	// Env should be used (no CLI flag, no config)
	resolved := cfg.ResolveGitLabToken("")
	if resolved.Value != "env_token" {
		t.Errorf("Expected 'env_token', got '%s'", resolved.Value)
	}
	if resolved.Source != TokenSourceEnv {
		t.Errorf("Expected source Env, got %s", resolved.Source)
	}
}

func TestResolveGitLabToken_NoneWhenNoTokens(t *testing.T) {
	// Ensure no env var
	os.Unsetenv("GIKI_GITLAB_TOKEN")

	cfg := &Config{
		// No config token
	}

	// Should return empty with source None
	resolved := cfg.ResolveGitLabToken("")
	if resolved.Value != "" {
		t.Errorf("Expected empty token, got '%s'", resolved.Value)
	}
	if resolved.Source != TokenSourceNone {
		t.Errorf("Expected source None, got %s", resolved.Source)
	}
}

func TestLoad_UsesDefaultPath(t *testing.T) {
	// This test verifies Load() calls the right path logic
	// We can't easily test the actual ~/.config/giki/config.toml
	// without mocking, but we can verify it doesn't crash
	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}
	// Should return empty config if file doesn't exist
	if cfg == nil {
		t.Error("Load should return non-nil config")
	}
}
