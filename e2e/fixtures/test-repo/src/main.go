package main

import "fmt"

// main is the entry point
func main() {
	fmt.Println("Hello, Giki!")
	fmt.Println("This is a test file for E2E tests")
}

// Helper function
func greet(name string) string {
	return fmt.Sprintf("Hello, %s!", name)
}
