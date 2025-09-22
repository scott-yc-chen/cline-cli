/**
 * CLI Test Setup
 *
 * CLI-specific test environment setup, equivalent to src/test/requires.ts
 * but for terminal/CLI environment instead of VSCode extension context.
 */

// Set up CLI test environment variables
process.env.NODE_ENV = 'test'
process.env.CLI_TEST_MODE = 'true'

// Mock terminal-specific globals that might be expected
if (typeof global.process === 'undefined') {
  (global as any).process = process
}

// Set up CLI-specific path handling
// CLI uses standard Node.js path handling, no special VSCode path utilities needed

// Mock any CLI-specific modules that might not be available during testing
const Module = require("module")
const originalRequire = Module.prototype.require

Module.prototype.require = function (path: string) {
  // Mock any CLI-specific modules that might cause issues in test environment
  // Currently none needed, but placeholder for future requirements

  return originalRequire.call(this, path)
}

// Set up test-specific console logging
if (process.env.CLI_TEST_SILENT !== 'false') {
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
    const originalConsole = require('console')
    Object.assign(console, originalConsole)
  },

  /**
   * Create a temporary directory for test isolation
   */
  async createTempDir(): Promise<string> {
    const fs = require('fs-extra')
    const path = require('path')
    const os = require('os')

    return await fs.mkdtemp(path.join(os.tmpdir(), 'cline-cli-test-'))
  },

  /**
   * Clean up temporary directory
   */
  async cleanupTempDir(dirPath: string): Promise<void> {
    const fs = require('fs-extra')
    await fs.remove(dirPath)
  }
}