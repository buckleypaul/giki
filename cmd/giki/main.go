package main

import (
	"log"

	"github.com/buckleypaul/giki/internal/server"
)

func main() {
	// Default port is 4242
	port := 4242

	srv := server.New(port)
	if err := srv.Start(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
