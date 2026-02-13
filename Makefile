.PHONY: build dev test clean frontend-build frontend-dev

# Build the giki binary
build: frontend-build
	go build -o giki ./cmd/giki

# Run in development mode (with GIKI_DEV=1)
dev:
	GIKI_DEV=1 go run ./cmd/giki .

# Run Go tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -f giki
	rm -rf ui/dist
	rm -rf ui/node_modules

# Build frontend for production
frontend-build:
	cd ui && npm install && npm run build

# Run frontend in development mode
frontend-dev:
	cd ui && npm run dev
