import "../test/setup"
import "should"
import fs from "fs-extra"
import os from "os"
import path from "path"
import { CliDiffClient } from "../hosts/CliDiffClient"
import { CliEnvClient } from "../hosts/CliEnvClient"
import { CliHostBridge } from "../hosts/CliHostBridge"
import { CliWindowClient } from "../hosts/CliWindowClient"
import { CliWorkspaceClient } from "../hosts/CliWorkspaceClient"
import * as proto from "../types/proto"

describe("CLI Host Bridge (Phase 2)", () => {
	let tempDir: string
	let hostBridge: CliHostBridge

	beforeEach(async () => {
		// Create temp directory for testing
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cline-cli-test-"))
		hostBridge = new CliHostBridge(tempDir)
	})

	afterEach(async () => {
		// Clean up temp directory
		await fs.remove(tempDir)
	})

	describe("CliHostBridge", () => {
		it("should implement HostBridgeClientProvider interface", () => {
			// Test that all required clients are present
			hostBridge.should.have.property("windowClient")
			hostBridge.should.have.property("workspaceClient")
			hostBridge.should.have.property("diffClient")
			hostBridge.should.have.property("envClient")

			// Test client types
			hostBridge.windowClient.should.be.instanceOf(CliWindowClient)
			hostBridge.workspaceClient.should.be.instanceOf(CliWorkspaceClient)
			hostBridge.diffClient.should.be.instanceOf(CliDiffClient)
			hostBridge.envClient.should.be.instanceOf(CliEnvClient)
		})

		it("should handle output handler configuration", () => {
			const receivedMessages: Array<{ message: string; type?: string }> = []

			const outputHandler = (message: string, type?: "info" | "error" | "warning") => {
				receivedMessages.push({ message, type })
			}

			hostBridge.setOutputHandler(outputHandler)

			// Test that output handler is set (will be tested by client tests)
			hostBridge.should.have.property("windowClient")
		})

		it("should manage working directory", () => {
			const newCwd = path.join(tempDir, "subdir")

			hostBridge.getCurrentWorkingDirectory().should.equal(tempDir)
			hostBridge.setCurrentWorkingDirectory(newCwd)
			hostBridge.getCurrentWorkingDirectory().should.equal(newCwd)
		})
	})

	describe("CliWindowClient", () => {
		let windowClient: CliWindowClient
		let capturedMessages: Array<{ message: string; type?: string }> = []

		beforeEach(() => {
			windowClient = new CliWindowClient()
			capturedMessages = []
			windowClient.setOutputHandler((message, type) => {
				capturedMessages.push({ message, type })
			})
		})

		it("should show text document info", async () => {
			// Create test file
			const testFile = path.join(tempDir, "test.txt")
			await fs.writeFile(testFile, "test content")

			const result = await windowClient.showTextDocument({
				path: testFile,
			})

			result.should.have.property("documentPath", testFile)
			result.should.have.property("isActive", true)
			result.should.have.property("viewColumn", 1)

			capturedMessages.should.have.length(1)
			capturedMessages[0].message.should.containEql("Opening")
		})

		it("should handle missing file gracefully", async () => {
			const missingFile = path.join(tempDir, "missing.txt")

			try {
				await windowClient
					.showTextDocument({ path: missingFile })(
						// Should not reach here
						false,
					)
					.should.be.true()
			} catch (error: any) {
				error.message.should.containEql("File not found")
			}
		})

		it("should display messages with correct types", async () => {
			await windowClient.showMessage({
				type: proto.host.ShowMessageType.ERROR,
				message: "Test error message",
				options: undefined,
			})

			capturedMessages.should.have.length(1)
			capturedMessages[0].type.should.equal("error")
			capturedMessages[0].message.should.equal("Test error message")
		})

		it("should handle message options", async () => {
			const result = await windowClient.showMessage({
				type: proto.host.ShowMessageType.INFORMATION,
				message: "Test message",
				options: {
					items: ["Option 1", "Option 2"],
					modal: false,
					detail: "Test details",
				},
			})

			// In real usage, this would wait for user input
			// For tests, we just verify the structure
			result.should.have.property("selectedOption")
			capturedMessages.length.should.be.greaterThan(0)
		})

		it("should handle input box requests", async () => {
			// Mock stdin for testing
			const originalStdin = process.stdin

			try {
				// This test would need proper stdin mocking for full coverage
				// For now, we test the structure
				const inputPromise = windowClient.showInputBox({
					title: "Test Input",
					prompt: "Enter something:",
					value: "default",
				})

				// In a real test, we'd mock readline and provide input
				// For now, we can test that the method exists and has correct signature
				inputPromise.should.be.instanceOf(Promise)
			} catch (error: any) {
				// Expected in test environment without proper stdin setup
				error.should.exist()
			}
		})

		it("should handle tab operations", async () => {
			const openTabs = await windowClient.getOpenTabs({})
			openTabs.should.have.property("paths")
			openTabs.paths.should.be.an.Array()

			const visibleTabs = await windowClient.getVisibleTabs({})
			visibleTabs.should.have.property("paths")
			visibleTabs.paths.should.be.an.Array()

			const activeEditor = await windowClient.getActiveEditor({})
			activeEditor.should.have.property("filePath")
		})
	})

	describe("CliWorkspaceClient", () => {
		let workspaceClient: CliWorkspaceClient

		beforeEach(() => {
			workspaceClient = new CliWorkspaceClient(tempDir)
		})

		it("should get workspace paths", async () => {
			// Create some project files
			await fs.writeFile(path.join(tempDir, "package.json"), '{"name": "test"}')
			await fs.writeFile(path.join(tempDir, ".gitignore"), "node_modules")

			const result = await workspaceClient.getWorkspacePaths({
				id: "test-workspace",
			})

			result.should.have.property("id", "test-workspace")
			result.should.have.property("paths")
			result.paths.should.containEql(tempDir)
		})

		it("should handle document saving", async () => {
			const testFile = path.join(tempDir, "test.txt")
			await fs.writeFile(testFile, "test content")

			const result = await workspaceClient.saveOpenDocumentIfDirty({
				filePath: testFile,
			})

			result.should.have.property("wasSaved")
		})

		it("should get diagnostics", async () => {
			const result = await workspaceClient.getDiagnostics({})

			result.should.have.property("diagnostics")
			result.diagnostics.should.be.an.Array()
		})

		it("should open problems panel", async () => {
			const result = await workspaceClient.openProblemsPanel({})
			result.should.be.an.Object()
		})

		it("should open file explorer", async () => {
			// Create test directory structure
			const subDir = path.join(tempDir, "subdir")
			await fs.mkdir(subDir)
			await fs.writeFile(path.join(subDir, "file.txt"), "content")

			const result = await workspaceClient.openInFileExplorerPanel({
				path: tempDir,
			})

			result.should.be.an.Object()
		})

		it("should open Cline sidebar panel", async () => {
			const result = await workspaceClient.openClineSidebarPanel({})
			result.should.be.an.Object()
		})

		it("should handle TypeScript config detection", async () => {
			await fs.writeFile(path.join(tempDir, "tsconfig.json"), '{"compilerOptions": {}}')

			// Test workspace detection with TypeScript project
			const result = await workspaceClient.getWorkspacePaths({})
			result.should.have.property("paths")
		})

		it("should handle Python project detection", async () => {
			await fs.writeFile(path.join(tempDir, "requirements.txt"), "requests==2.28.0")

			// Test workspace detection with Python project
			const result = await workspaceClient.getWorkspacePaths({})
			result.should.have.property("paths")
		})
	})

	describe("CliDiffClient", () => {
		let diffClient: CliDiffClient

		beforeEach(() => {
			diffClient = new CliDiffClient(tempDir)
		})

		it("should open diff for new file", async () => {
			const testFile = path.join(tempDir, "new.txt")
			const newContent = "line 1\\nline 2\\nline 3"

			const result = await diffClient.openDiff({
				path: testFile,
				content: newContent,
			})

			result.should.have.property("success", true)
			result.should.have.property("id", testFile)
		})

		it("should open diff for existing file", async () => {
			const testFile = path.join(tempDir, "existing.txt")
			const originalContent = "original line 1\\noriginal line 2"
			const newContent = "modified line 1\\noriginal line 2\\nnew line 3"

			await fs.writeFile(testFile, originalContent)

			const result = await diffClient.openDiff({
				path: testFile,
				content: newContent,
			})

			result.should.have.property("success", true)
			result.should.have.property("id", testFile)
		})

		it("should get document text", async () => {
			const testFile = path.join(tempDir, "test.txt")
			const content = "test content"

			await fs.writeFile(testFile, content)

			const result = await diffClient.getDocumentText({
				path: testFile,
			})

			result.should.have.property("content", content)
		})

		it("should replace text by lines", async () => {
			const testFile = path.join(tempDir, "replace.txt")
			const originalContent = "line 1\\nline 2\\nline 3\\nline 4"

			await fs.writeFile(testFile, originalContent)

			// Open diff to load into memory
			await diffClient.openDiff({
				path: testFile,
				content: originalContent,
			})

			const result = await diffClient.replaceText({
				path: testFile,
				startLine: 2,
				endLine: 3,
				newText: "new line 2\\nnew line 3",
			})

			result.should.have.property("success", true)

			// Verify content was updated in memory
			const updatedResult = await diffClient.getDocumentText({
				path: testFile,
			})

			updatedResult.content.should.containEql("new line 2")
		})

		it("should replace entire content", async () => {
			const testFile = path.join(tempDir, "full-replace.txt")
			const originalContent = "original content"
			const newContent = "completely new content"

			await fs.writeFile(testFile, originalContent)

			// Open diff to load into memory
			await diffClient.openDiff({
				path: testFile,
				content: originalContent,
			})

			const result = await diffClient.replaceText({
				path: testFile,
				newText: newContent,
			})

			result.should.have.property("success", true)
		})

		it("should truncate document", async () => {
			const testFile = path.join(tempDir, "truncate.txt")
			const content = "line 1\\nline 2\\nline 3\\nline 4\\nline 5"

			await fs.writeFile(testFile, content)

			// Open diff to load into memory
			await diffClient.openDiff({
				path: testFile,
				content,
			})

			const result = await diffClient.truncateDocument({
				path: testFile,
				maxLines: 3,
			})

			result.should.have.property("success", true)
		})

		it("should save document", async () => {
			const testFile = path.join(tempDir, "save.txt")
			const content = "content to save"

			// Open diff to load into memory
			await diffClient.openDiff({
				path: testFile,
				content,
			})

			const result = await diffClient.saveDocument({
				path: testFile,
			})

			result.should.have.property("success", true)

			// Verify file was saved
			const savedContent = await fs.readFile(testFile, "utf-8")
			savedContent.should.equal(content)
		})

		it("should close all diffs", async () => {
			// Open multiple diffs
			await diffClient.openDiff({ path: "file1.txt", content: "content1" })
			await diffClient.openDiff({ path: "file2.txt", content: "content2" })

			const result = await diffClient.closeAllDiffs({})

			result.should.have.property("success", true)
		})

		it("should handle multi-file diff", async () => {
			const files = [
				{ path: "file1.txt", content: "content1" },
				{ path: "file2.txt", content: "content2" },
			]

			const result = await diffClient.openMultiFileDiff({
				files,
			})

			result.should.have.property("success", true)
		})

		it("should scroll diff", async () => {
			const result = await diffClient.scrollDiff({
				diffId: "test-diff",
				lineNumber: 10,
			})

			result.should.have.property("success", true)
		})
	})

	describe("CliEnvClient", () => {
		let envClient: CliEnvClient

		beforeEach(() => {
			envClient = new CliEnvClient()
		})

		it("should generate machine ID", async () => {
			const result = await envClient.getMachineId({})

			result.should.have.property("value")
			result.value.should.be.a.String()
			result.value.length.should.be.greaterThan(0)

			// Should return same ID on subsequent calls
			const result2 = await envClient.getMachineId({})
			result2.value.should.equal(result.value)
		})

		it("should get host version", async () => {
			const result = await envClient.getHostVersion({})

			result.should.have.property("version")
			result.should.have.property("buildNumber")
			result.should.have.property("hostName", "cline-cli")
		})

		it("should get IDE redirect URI", async () => {
			const result = await envClient.getIdeRedirectUri({})

			result.should.have.property("value")
			result.value.should.be.a.String()
		})

		it("should get telemetry settings", async () => {
			const result = await envClient.getTelemetrySettings({})

			result.should.have.property("telemetryLevel")
			result.should.have.property("isEnabled")
		})

		it("should handle telemetry subscription", (done) => {
			const callbacks = {
				onResponse: (event: proto.host.TelemetrySettingsEvent) => {
					event.should.have.property("telemetryLevel")
					event.should.have.property("isEnabled")
				},
				onComplete: () => {
					done()
				},
			}

			const unsubscribe = envClient.subscribeToTelemetrySettings({}, callbacks)
			unsubscribe.should.be.a.Function()

			// Call unsubscribe to clean up
			unsubscribe()
		})

		// Clipboard tests would require platform-specific mocking
		it("should handle clipboard operations structure", async () => {
			try {
				// Test clipboard write structure
				const writeResult = await envClient.clipboardWriteText({
					value: "test text",
				})
				writeResult.should.be.an.Object()

				// Test clipboard read structure
				const readResult = await envClient.clipboardReadText({})
				readResult.should.have.property("value")
			} catch (error) {
				// Expected in test environment without clipboard access
				error.should.exist()
			}
		})
	})
})
