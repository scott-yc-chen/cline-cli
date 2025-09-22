import "../test/setup"
import "should"
import { CliHostBridge } from "../hosts/CliHostBridge"

describe("CLI Host Simple Tests", () => {
	it("should create CLI host bridge", () => {
		const hostBridge = new CliHostBridge()

		hostBridge.should.have.property("windowClient")
		hostBridge.should.have.property("workspaceClient")
		hostBridge.should.have.property("diffClient")
		hostBridge.should.have.property("envClient")
	})

	it("should implement all interface methods", () => {
		const hostBridge = new CliHostBridge()

		// WindowClient methods
		const windowMethods = [
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

		for (const method of windowMethods) {
			hostBridge.windowClient.should.have.property(method)
			typeof hostBridge.windowClient[method].should.equal("function")
		}

		// WorkspaceClient methods
		const workspaceMethods = [
			"getWorkspacePaths",
			"saveOpenDocumentIfDirty",
			"getDiagnostics",
			"openProblemsPanel",
			"openInFileExplorerPanel",
			"openClineSidebarPanel",
		]

		for (const method of workspaceMethods) {
			hostBridge.workspaceClient.should.have.property(method)
			typeof hostBridge.workspaceClient[method].should.equal("function")
		}

		// DiffClient methods
		const diffMethods = [
			"openDiff",
			"getDocumentText",
			"replaceText",
			"scrollDiff",
			"truncateDocument",
			"saveDocument",
			"closeAllDiffs",
			"openMultiFileDiff",
		]

		for (const method of diffMethods) {
			hostBridge.diffClient.should.have.property(method)
			typeof hostBridge.diffClient[method].should.equal("function")
		}

		// EnvClient methods
		const envMethods = [
			"clipboardWriteText",
			"clipboardReadText",
			"getMachineId",
			"getHostVersion",
			"getIdeRedirectUri",
			"getTelemetrySettings",
			"subscribeToTelemetrySettings",
		]

		for (const method of envMethods) {
			hostBridge.envClient.should.have.property(method)
			typeof hostBridge.envClient[method].should.equal("function")
		}
	})

	it("should handle output messages", () => {
		const hostBridge = new CliHostBridge()
		const messages: Array<{ message: string; type?: string }> = []

		hostBridge.setOutputHandler((message, type) => {
			messages.push({ message, type })
		})

		// Should set up output handler without errors
		messages.length.should.equal(0)
	})

	it("should manage working directory", () => {
		const hostBridge = new CliHostBridge("/test/path")

		hostBridge.getCurrentWorkingDirectory().should.equal("/test/path")

		hostBridge.setCurrentWorkingDirectory("/new/path")
		hostBridge.getCurrentWorkingDirectory().should.equal("/new/path")
	})
})
