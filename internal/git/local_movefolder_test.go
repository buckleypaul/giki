package git

import (
	"os"
	"path/filepath"
	"testing"
)

func TestMoveFolder(t *testing.T) {
	// Create temporary git repository with initial commit
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	provider, err := NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("Failed to create provider: %v", err)
	}

	// Create source folder with files
	srcDir := filepath.Join(provider.path, "oldfolder")
	if err := os.MkdirAll(srcDir, 0755); err != nil {
		t.Fatalf("Failed to create source folder: %v", err)
	}
	if err := os.WriteFile(filepath.Join(srcDir, "file1.txt"), []byte("content1"), 0644); err != nil {
		t.Fatalf("Failed to create file1.txt: %v", err)
	}

	// Create nested folder
	nestedDir := filepath.Join(srcDir, "nested")
	if err := os.MkdirAll(nestedDir, 0755); err != nil {
		t.Fatalf("Failed to create nested folder: %v", err)
	}
	if err := os.WriteFile(filepath.Join(nestedDir, "file2.txt"), []byte("content2"), 0644); err != nil {
		t.Fatalf("Failed to create file2.txt: %v", err)
	}

	// Move folder
	if err := provider.MoveFolder("oldfolder", "newfolder"); err != nil {
		t.Fatalf("MoveFolder failed: %v", err)
	}

	// Verify old folder doesn't exist
	if _, err := os.Stat(srcDir); !os.IsNotExist(err) {
		t.Errorf("Old folder still exists")
	}

	// Verify new folder exists with correct files
	destDir := filepath.Join(provider.path, "newfolder")
	if _, err := os.Stat(destDir); err != nil {
		t.Errorf("New folder doesn't exist: %v", err)
	}

	file1Path := filepath.Join(destDir, "file1.txt")
	content1, err := os.ReadFile(file1Path)
	if err != nil {
		t.Errorf("file1.txt not found in new location: %v", err)
	}
	if string(content1) != "content1" {
		t.Errorf("file1.txt content mismatch: got %q, want %q", string(content1), "content1")
	}

	file2Path := filepath.Join(destDir, "nested", "file2.txt")
	content2, err := os.ReadFile(file2Path)
	if err != nil {
		t.Errorf("nested/file2.txt not found in new location: %v", err)
	}
	if string(content2) != "content2" {
		t.Errorf("file2.txt content mismatch: got %q, want %q", string(content2), "content2")
	}
}

func TestMoveFolder_SourceNotFound(t *testing.T) {
	// Create temporary git repository with initial commit
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	provider, err := NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("Failed to create provider: %v", err)
	}

	err = provider.MoveFolder("nonexistent", "newfolder")
	if err == nil {
		t.Fatal("Expected error when moving nonexistent folder, got nil")
	}
}

func TestMoveFolder_DestinationExists(t *testing.T) {
	// Create temporary git repository with initial commit
	tempDir := t.TempDir()
	createTestRepoWithCommit(t, tempDir)

	provider, err := NewLocalProvider(tempDir, "")
	if err != nil {
		t.Fatalf("Failed to create provider: %v", err)
	}

	// Create source folder
	srcDir := filepath.Join(provider.path, "oldfolder")
	if err := os.MkdirAll(srcDir, 0755); err != nil {
		t.Fatalf("Failed to create source folder: %v", err)
	}

	// Create destination folder
	destDir := filepath.Join(provider.path, "newfolder")
	if err := os.MkdirAll(destDir, 0755); err != nil {
		t.Fatalf("Failed to create destination folder: %v", err)
	}

	err = provider.MoveFolder("oldfolder", "newfolder")
	if err == nil {
		t.Fatal("Expected error when destination exists, got nil")
	}
}
