package config

import (
	"os"
	"path/filepath"

	"github.com/pelletier/go-toml/v2"
)

// Config holds all application configuration
type Config struct {
	// Tokens for authentication
	GitHubToken string `toml:"github_token"`
	GitLabToken string `toml:"gitlab_token"`
}

// TokenSource describes where a token came from
type TokenSource string

const (
	TokenSourceCLI    TokenSource = "cli"
	TokenSourceConfig TokenSource = "config"
	TokenSourceEnv    TokenSource = "env"
	TokenSourceNone   TokenSource = "none"
)

// ResolvedToken contains a token and its source
type ResolvedToken struct {
	Value  string
	Source TokenSource
}

// Load reads configuration from the default config file location
// (~/.config/giki/config.toml). Returns an empty config if the file
// doesn't exist (not an error).
func Load() (*Config, error) {
	configPath, err := defaultConfigPath()
	if err != nil {
		return nil, err
	}

	return LoadFrom(configPath)
}

// LoadFrom reads configuration from the specified file path.
// Returns an empty config if the file doesn't exist (not an error).
func LoadFrom(path string) (*Config, error) {
	// If config file doesn't exist, return empty config (not an error)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return &Config{}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := toml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

// ResolveGitHubToken determines which GitHub token to use based on precedence:
// CLI flag > config file > env var
func (c *Config) ResolveGitHubToken(cliToken string) ResolvedToken {
	// CLI flag takes highest precedence
	if cliToken != "" {
		return ResolvedToken{Value: cliToken, Source: TokenSourceCLI}
	}

	// Config file is next
	if c.GitHubToken != "" {
		return ResolvedToken{Value: c.GitHubToken, Source: TokenSourceConfig}
	}

	// Environment variable is last
	if envToken := os.Getenv("GIKI_GITHUB_TOKEN"); envToken != "" {
		return ResolvedToken{Value: envToken, Source: TokenSourceEnv}
	}

	return ResolvedToken{Value: "", Source: TokenSourceNone}
}

// ResolveGitLabToken determines which GitLab token to use based on precedence:
// CLI flag > config file > env var
func (c *Config) ResolveGitLabToken(cliToken string) ResolvedToken {
	// CLI flag takes highest precedence
	if cliToken != "" {
		return ResolvedToken{Value: cliToken, Source: TokenSourceCLI}
	}

	// Config file is next
	if c.GitLabToken != "" {
		return ResolvedToken{Value: c.GitLabToken, Source: TokenSourceConfig}
	}

	// Environment variable is last
	if envToken := os.Getenv("GIKI_GITLAB_TOKEN"); envToken != "" {
		return ResolvedToken{Value: envToken, Source: TokenSourceEnv}
	}

	return ResolvedToken{Value: "", Source: TokenSourceNone}
}

// defaultConfigPath returns the default config file path
func defaultConfigPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	return filepath.Join(home, ".config", "giki", "config.toml"), nil
}
