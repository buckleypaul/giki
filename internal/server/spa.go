package server

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

// NewSPAHandler creates an HTTP handler that serves a single-page application.
// It serves static files from the embedded filesystem and falls back to index.html
// for routes that don't match files (to support client-side routing).
// Paths starting with /api/ are explicitly excluded from SPA fallback.
func NewSPAHandler(embeddedFS embed.FS, devMode bool) http.Handler {
	if devMode {
		// In dev mode, proxy requests to the Vite dev server
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Don't proxy API requests - they'll be handled by the API handlers
			if strings.HasPrefix(r.URL.Path, "/api/") {
				http.NotFound(w, r)
				return
			}

			// Proxy to Vite dev server
			viteURL := "http://localhost:5173" + r.URL.Path
			if r.URL.RawQuery != "" {
				viteURL += "?" + r.URL.RawQuery
			}

			resp, err := http.Get(viteURL)
			if err != nil {
				http.Error(w, "Failed to reach Vite dev server: "+err.Error(), http.StatusBadGateway)
				return
			}
			defer resp.Body.Close()

			// Copy headers
			for key, values := range resp.Header {
				for _, value := range values {
					w.Header().Add(key, value)
				}
			}

			w.WriteHeader(resp.StatusCode)
			// Copy body
			if _, err := w.Write([]byte{}); err == nil {
				// Read from resp.Body and write to w
				buf := make([]byte, 32*1024)
				for {
					n, err := resp.Body.Read(buf)
					if n > 0 {
						w.Write(buf[:n])
					}
					if err != nil {
						break
					}
				}
			}
		})
	}

	// Production mode: serve from embedded filesystem
	// Strip the "dist" prefix since embeddedFS contains the dist directory
	stripped, err := fs.Sub(embeddedFS, "dist")
	if err != nil {
		panic("failed to create sub filesystem: " + err.Error())
	}

	fileServer := http.FileServer(http.FS(stripped))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Never serve index.html for /api/ paths - let them 404
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		// Check if the file exists
		_, err := stripped.Open(path)
		if err != nil {
			// File not found - serve index.html for SPA routing
			r.URL.Path = "/"
		}

		fileServer.ServeHTTP(w, r)
	})
}
