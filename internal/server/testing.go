package server

import (
	"time"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// testCommitOptions returns gogit.CommitOptions with a test author signature.
// This is required for go-git v5.16.5+ which mandates author information.
func testCommitOptions() *gogit.CommitOptions {
	return &gogit.CommitOptions{
		Author: &object.Signature{
			Name:  "Test Author",
			Email: "test@example.com",
			When:  time.Now(),
		},
	}
}
