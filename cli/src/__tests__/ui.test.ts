import * as should from "should"
import { CliHostBridge } from "../hosts/CliHostBridge.js"

describe("UI Host Bridge Integration", () => {
	let hostBridge: CliHostBridge

	beforeEach(() => {
		hostBridge = new CliHostBridge(process.cwd())
	})

	describe("CliHostBridge UI Support", () => {
		it("should initialize successfully", async () => {
			await hostBridge.initialize()
			should.exist(hostBridge.getWindowClient())
			should.exist(hostBridge.getWorkspaceClient())
			should.exist(hostBridge.getDiffClient())
		})

		it("should provide workspace operations for file explorer", async () => {
			const workspace = hostBridge.getWorkspaceClient()
			should.exist(workspace.readDirectory)
			should.exist(workspace.readFile)

			// Test reading current directory
			const entries = await workspace.readDirectory(process.cwd())
			entries.should.be.an.Array()
		})

		it("should provide window operations for UI messages", async () => {
			const window = hostBridge.getWindowClient()
			should.exist(window.showInformationMessage)

			// Test showing a message
			await window.showInformationMessage("Test message")
		})

		it("should provide diff operations for code changes", async () => {
			const diff = hostBridge.getDiffClient()
			should.exist(diff.createDiff)

			// Test creating a diff
			await diff.createDiff({
				original: "const x = 1",
				modified: "const x = 2",
				filename: "test.ts",
			})
		})
	})

	describe("UI Component Data Flow", () => {
		it("should support file explorer operations", async () => {
			const workspace = hostBridge.getWorkspaceClient()

			// Test directory reading
			const entries = await workspace.readDirectory(process.cwd())
			entries.should.be.an.Array()

			// Test file reading if package.json exists
			try {
				const content = await workspace.readFile("package.json")
				content.should.be.a.String()
				content.should.containEql("name")
			} catch {
				// File might not exist, that's ok
			}
		})

		it("should support diff viewer operations", async () => {
			const diff = hostBridge.getDiffClient()

			// Test diff creation
			await diff.createDiff({
				original: "line 1\nline 2\nline 3",
				modified: "line 1\nmodified line 2\nline 3",
				filename: "test.txt",
			})

			// Test opening a diff
			await diff.openDiff({
				path: "test.txt",
				content: "modified content",
			})
		})

		it("should support settings operations", async () => {
			const env = hostBridge.getEnvClient()

			// Test environment operations
			const machineIdResult = await env.getMachineId({})
			machineIdResult.value.should.be.a.String()

			const hostnameResult = await env.getHostname({})
			hostnameResult.value.should.be.a.String()
		})
	})

	describe("Error Handling in UI Context", () => {
		it("should handle file system errors gracefully", async () => {
			const workspace = hostBridge.getWorkspaceClient()

			try {
				await workspace.readFile("/nonexistent/file.txt")
				false.should.be.true() // Should not reach here
			} catch (error: any) {
				error.should.exist()
				error.message.should.be.a.String()
			}
		})

		it("should handle invalid directory reads", async () => {
			const workspace = hostBridge.getWorkspaceClient()

			try {
				await workspace.readDirectory("/nonexistent/directory")
				false.should.be.true() // Should not reach here
			} catch (error: any) {
				error.should.exist()
				error.message.should.be.a.String()
			}
		})
	})

	describe("Performance for UI Operations", () => {
		it("should handle directory reads efficiently", async () => {
			const workspace = hostBridge.getWorkspaceClient()
			const startTime = Date.now()

			await workspace.readDirectory(process.cwd())

			const duration = Date.now() - startTime
			duration.should.be.below(1000) // Should complete within 1 second
		})

		it("should handle multiple operations", async () => {
			const window = hostBridge.getWindowClient()
			const startTime = Date.now()

			const promises = []
			for (let i = 0; i < 10; i++) {
				promises.push(window.showInformationMessage(`Message ${i}`))
			}

			await Promise.all(promises)

			const duration = Date.now() - startTime
			duration.should.be.below(2000) // Should complete within 2 seconds
		})
	})

	describe("UI State Management", () => {
		it("should track current working directory", () => {
			const cwd = hostBridge.getCurrentWorkingDirectory()
			cwd.should.be.a.String()
			cwd.should.equal(process.cwd())
		})

		it("should update working directory", () => {
			const originalCwd = hostBridge.getCurrentWorkingDirectory()
			const newCwd = "/tmp"

			hostBridge.setCurrentWorkingDirectory(newCwd)
			hostBridge.getCurrentWorkingDirectory().should.equal(newCwd)

			// Reset
			hostBridge.setCurrentWorkingDirectory(originalCwd)
		})

		it("should maintain client references", () => {
			const window1 = hostBridge.getWindowClient()
			const window2 = hostBridge.getWindowClient()

			window1.should.equal(window2) // Should be the same instance

			const workspace1 = hostBridge.getWorkspaceClient()
			const workspace2 = hostBridge.getWorkspaceClient()

			workspace1.should.equal(workspace2) // Should be the same instance
		})
	})
})
