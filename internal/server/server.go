package server

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/buckleypaul/giki/ui"
)

// Server represents the HTTP server for the Giki application.
type Server struct {
	mux  *http.ServeMux
	port int
}

// New creates a new Server instance.
func New(port int) *Server {
	mux := http.NewServeMux()

	// Check if we're in dev mode
	devMode := os.Getenv("GIKI_DEV") == "1"

	// Mount SPA handler as catch-all
	// API handlers will be mounted before this in later steps
	spaHandler := NewSPAHandler(ui.Dist, devMode)
	mux.Handle("/", spaHandler)

	return &Server{
		mux:  mux,
		port: port,
	}
}

// Start begins listening on the configured port.
// Returns an error if the port is already in use or if the server fails to start.
func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.port)

	// Check if port is available
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("port %d is already in use", s.port)
	}
	listener.Close()

	log.Printf("Starting server on http://localhost%s", addr)

	return http.ListenAndServe(addr, s.mux)
}
