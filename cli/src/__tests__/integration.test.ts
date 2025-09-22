import "../test/setup"
import "should"
import fs from "fs-extra"
import os from "os"
import path from "path"
import { CliHostBridge } from "../hosts/CliHostBridge"

describe("CLI Host Integration (Phase 2)", () => {
	let tempDir: string
	let hostBridge: CliHostBridge

	beforeEach(async () => {
		// Create temp directory for testing
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cline-cli-integration-"))
		hostBridge = new CliHostBridge(tempDir)
	})

	afterEach(async () => {
		// Clean up temp directory
		await fs.remove(tempDir)
	})

	describe("CLI Host Bridge Integration", () => {
		it("should provide consistent interface implementations", async () => {
			// Test that all clients implement their expected interfaces
			hostBridge.should.have.property("windowClient")
			hostBridge.should.have.property("workspaceClient")
			hostBridge.should.have.property("diffClient")
			hostBridge.should.have.property("envClient")

			// Test basic functionality integration
			const testFile = path.join(tempDir, "integration.txt")
			await fs.writeFile(testFile, "test content")

			const windowResult = await hostBridge.windowClient.showTextDocument({
				path: testFile,
			})
			windowResult.should.have.property("documentPath", testFile)
		})

		it("should handle cross-client operations", async () => {
			// Test operations that involve multiple clients working together
			const testFile = path.join(tempDir, "cross-client.js")

			// 1. Use diff client to create content
			await hostBridge.diffClient.openDiff({
				path: testFile,
				content: "console.log('hello world');",
			})

			// 2. Use diff client to save
			await hostBridge.diffClient.saveDocument({
				path: testFile,
			})

			// 3. Use window client to show the file
			const showResult = await hostBridge.windowClient.showTextDocument({
				path: testFile,
			})

			showResult.should.have.property("documentPath", testFile)

			// 4. Verify file exists through workspace operations
			const workspaceResult = await hostBridge.workspaceClient.getWorkspacePaths({})
			workspaceResult.should.have.property("paths")
		})

		it("should maintain consistent error handling", async () => {
			// Test that error handling patterns are consistent across clients
			const nonexistentFile = path.join(tempDir, "nonexistent.txt")

			try {
				const _result = await hostBridge.windowClient.showTextDocument({
					path: nonexistentFile,
				})
				// Should not reach here
				false.should.be.true()
			} catch (error: any) {
				error.should.exist()
				error.message.should.be.a.String()
			}
		})

		it("should support message handling integration", async () => {
			const messages: Array<{ message: string; type?: string }> = []

			// Set up message capture
			hostBridge.setOutputHandler((message, type) => {
				messages.push({ message, type })
			})

			// Test different message types across clients
			await hostBridge.windowClient.showMessage({
				type: 0, // ERROR
				message: "Test error message",
				options: undefined,
			})

			messages.should.have.length(1)
			messages[0].type.should.equal("error")
		})

		it("should handle complex diff scenarios", async () => {
			const file1 = path.join(tempDir, "complex1.ts")
			const file2 = path.join(tempDir, "complex2.ts")

			const content1 = "export class Test1 {\n  method1() {}\n}"
			const content2 = "export class Test2 {\n  method2() {}\n}"

			// Open multiple diffs
			const result1 = await hostBridge.diffClient.openDiff({ path: file1, content: content1 })
			const result2 = await hostBridge.diffClient.openDiff({ path: file2, content: content2 })

			result1.should.have.property("success", true)
			result2.should.have.property("success", true)

			// Test multi-file operations
			const multiResult = await hostBridge.diffClient.openMultiFileDiff({
				files: [
					{ path: file1, content: content1 + "\n// modified" },
					{ path: file2, content: content2 + "\n// also modified" },
				],
			})

			multiResult.should.have.property("success", true)

			// Close all diffs
			const closeResult = await hostBridge.diffClient.closeAllDiffs({})
			closeResult.should.have.property("success", true)
		})

		it("should support workspace diagnostics integration", async () => {
			// Create a project structure
			await fs.writeFile(
				path.join(tempDir, "package.json"),
				JSON.stringify({
					name: "test-project",
					version: "1.0.0",
				}),
			)

			await fs.writeFile(
				path.join(tempDir, "index.js"),
				`
console.log('hello world');
// This is a test file
			`,
			)

			// Test workspace operations
			const workspaceResult = await hostBridge.workspaceClient.getWorkspacePaths({})
			workspaceResult.should.have.property("paths")
			workspaceResult.paths.should.containEql(tempDir)

			// Test diagnostics
			const diagnosticsResult = await hostBridge.workspaceClient.getDiagnostics({})
			diagnosticsResult.should.have.property("diagnostics")
			diagnosticsResult.diagnostics.should.be.an.Array()

			// Test problems panel
			const problemsResult = await hostBridge.workspaceClient.openProblemsPanel({})
			problemsResult.should.be.an.Object()
		})

		it("should maintain state consistency across operations", async () => {
			const testFile = path.join(tempDir, "state-test.js")

			// Step 1: Open diff
			await hostBridge.diffClient.openDiff({
				path: testFile,
				content: "console.log('initial');",
			})

			// Step 2: Modify content
			await hostBridge.diffClient.replaceText({
				path: testFile,
				newText: "console.log('modified');",
			})

			// Step 3: Verify state
			const textResult = await hostBridge.diffClient.getDocumentText({
				path: testFile,
			})
			textResult.content.should.equal("console.log('modified');")

			// Step 4: Save and verify persistence
			await hostBridge.diffClient.saveDocument({ path: testFile })

			const savedContent = await fs.readFile(testFile, "utf-8")
			savedContent.should.equal("console.log('modified');")
		})

		it("should handle environment operations consistently", async () => {
			// Test environment client integration
			const machineIdResult = await hostBridge.envClient.getMachineId({})
			machineIdResult.should.have.property("value")
			machineIdResult.value.should.be.a.String()

			// Test host version
			const versionResult = await hostBridge.envClient.getHostVersion({})
			versionResult.should.have.property("hostName", "cline-cli")
			versionResult.should.have.property("version")

			// Test telemetry settings
			const telemetryResult = await hostBridge.envClient.getTelemetrySettings({})
			telemetryResult.should.have.property("isEnabled")
			telemetryResult.should.have.property("telemetryLevel")
		})
	})

	describe("Feature Parity Validation", () => {
		it("should implement all required WindowService methods", () => {
			const client = hostBridge.windowClient

			// Check all methods exist and are functions
			const requiredMethods = [
				"showTextDocument",
				"showOpenDialogue",
				"showMessage",
				"showInputBox",
				"showSaveDialog",
				"openFile",
				"openSettings",
				"getOpenTabs",
				"getVisibleTabs",
				"getActiveEditor",
			]

			for (const method of requiredMethods) {
				client.should.have.property(method)
				client[method].should.be.a.Function()
			}
		})

		it("should implement all required WorkspaceService methods", () => {
			const client = hostBridge.workspaceClient

			const requiredMethods = [
				"getWorkspacePaths",
				"saveOpenDocumentIfDirty",
				"getDiagnostics",
				"openProblemsPanel",
				"openInFileExplorerPanel",
				"openClineSidebarPanel",
			]

			for (const method of requiredMethods) {
				client.should.have.property(method)
				client[method].should.be.a.Function()
			}
		})

		it("should implement all required DiffService methods", () => {
			const client = hostBridge.diffClient

			const requiredMethods = [
				"openDiff",
				"getDocumentText",
				"replaceText",
				"scrollDiff",
				"truncateDocument",
				"saveDocument",
				"closeAllDiffs",
				"openMultiFileDiff",
			]

			for (const method of requiredMethods) {
				client.should.have.property(method)
				client[method].should.be.a.Function()
			}
		})

		it("should implement all required EnvService methods", () => {
			const client = hostBridge.envClient

			const requiredMethods = [
				"clipboardWriteText",
				"clipboardReadText",
				"getMachineId",
				"getHostVersion",
				"getIdeRedirectUri",
				"getTelemetrySettings",
				"subscribeToTelemetrySettings",
			]

			for (const method of requiredMethods) {
				client.should.have.property(method)
				client[method].should.be.a.Function()
			}
		})
	})
})
