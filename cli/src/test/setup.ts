/**
 * CLI Test Setup
 *
 * CLI-specific test environment setup, equivalent to src/test/requires.ts
 * but for terminal/CLI environment instead of VSCode extension context.
 */

import fs from "fs-extra"
import { createRequire } from "module"
import os from "os"
import path from "path"

const require = createRequire(import.meta.url)

// Set up CLI test environment variables
process.env.NODE_ENV = "test"
process.env.CLI_TEST_MODE = "true"

// Mock terminal-specific globals that might be expected
if (typeof global.process === "undefined") {
	;(global as any).process = process
}

// Set up test-specific console logging
if (process.env.CLI_TEST_SILENT !== "false") {
	// Suppress console output during tests unless explicitly enabled
	const originalConsole = { ...console }
	console.log = () => {}
	console.info = () => {}
	console.warn = () => {}

	// Keep error logging for test debugging
	console.error = originalConsole.error
}

// Export test utilities for CLI tests
export const testUtils = {
	/**
	 * Reset console to original state (useful for specific tests that need output)
	 */
	enableConsole() {
		const originalConsole = require("console")
		Object.assign(console, originalConsole)
	},

	/**
	 * Create a temporary directory for test isolation
	 */
	async createTempDir(): Promise<string> {
		return await fs.mkdtemp(path.join(os.tmpdir(), "cline-cli-test-"))
	},

	/**
	 * Clean up temporary directory
	 */
	async cleanupTempDir(dirPath: string): Promise<void> {
		await fs.remove(dirPath)
	},
}
