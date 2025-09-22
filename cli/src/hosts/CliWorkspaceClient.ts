import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import { WorkspaceServiceClientInterface } from "../types/host-bridge-client-types"
import * as proto from "../types/proto"

/**
 * CLI implementation of WorkspaceService client.
 * Handles file system operations, workspace management, and project detection.
 */
export class CliWorkspaceClient implements WorkspaceServiceClientInterface {
	private cwd: string
	private outputHandler?: (message: string, type?: "info" | "error" | "warning") => void

	constructor(cwd: string) {
		this.cwd = cwd
	}

	/**
	 * Set output handler for displaying messages
	 */
	setOutputHandler(handler: (message: string, type?: "info" | "error" | "warning") => void): void {
		this.outputHandler = handler
	}

	/**
	 * Set current working directory
	 */
	setCurrentWorkingDirectory(cwd: string): void {
		this.cwd = cwd
	}

	/**
	 * Display a message in the terminal
	 */
	private displayMessage(message: string, type: "info" | "error" | "warning" = "info"): void {
		if (this.outputHandler) {
			this.outputHandler(message, type)
		} else {
			const prefix = type === "error" ? "❌" : type === "warning" ? "⚠️" : "ℹ️"
			console.log(`${prefix} ${message}`)
		}
	}

	/**
	 * Gets workspace paths (returns current working directory and detects project structure)
	 */
	async getWorkspacePaths(request: proto.host.GetWorkspacePathsRequest): Promise<proto.host.GetWorkspacePathsResponse> {
		const workspaceId = request.id || "cli-workspace"

		try {
			// Check if current directory is a project root (has common project files)
			const projectFiles = [
				"package.json",
				"pyproject.toml",
				"requirements.txt",
				"Cargo.toml",
				"go.mod",
				"pom.xml",
				"build.gradle",
				"Makefile",
				".git",
				".gitignore",
			]

			const foundFiles = []
			for (const file of projectFiles) {
				try {
					const filePath = path.join(this.cwd, file)
					await fs.access(filePath)
					foundFiles.push(file)
				} catch {
					// File doesn't exist, continue
				}
			}

			if (foundFiles.length > 0) {
				this.displayMessage(`📁 Workspace detected: ${this.cwd}`)
				this.displayMessage(`📄 Project files found: ${foundFiles.join(", ")}`)
			}

			return {
				id: workspaceId,
				paths: [this.cwd],
			}
		} catch (error) {
			this.displayMessage(`Error getting workspace paths: ${error}`, "error")
			return {
				id: workspaceId,
				paths: [this.cwd],
			}
		}
	}

	/**
	 * Saves an open document if dirty (in CLI, this checks if file exists and is writable)
	 */
	async saveOpenDocumentIfDirty(
		request: proto.host.SaveOpenDocumentIfDirtyRequest,
	): Promise<proto.host.SaveOpenDocumentIfDirtyResponse> {
		if (!request.filePath) {
			return { wasSaved: false }
		}

		try {
			// Check if file exists and is writable
			await fs.access(request.filePath, fs.constants.F_OK | fs.constants.W_OK)

			// In CLI context, we can't determine if a file is "dirty" since we don't maintain
			// an editor state. We'll assume the operation was successful.
			this.displayMessage(`💾 File access verified: ${request.filePath}`)
			return { wasSaved: false } // No actual save operation needed
		} catch (_error) {
			this.displayMessage(`Cannot access file for saving: ${request.filePath}`, "warning")
			return { wasSaved: false }
		}
	}

	/**
	 * Gets diagnostics from the workspace (attempts to run language server or linter)
	 */
	async getDiagnostics(_request: proto.host.GetDiagnosticsRequest): Promise<proto.host.GetDiagnosticsResponse> {
		const diagnostics: proto.host.Diagnostic[] = []

		try {
			// Try to run TypeScript compiler for .ts files if available
			if (await this.hasTypeScriptConfig()) {
				const tscDiagnostics = await this.getTypeScriptDiagnostics()
				diagnostics.push(...tscDiagnostics)
			}

			// Try to run Python linters for Python projects
			if (await this.hasPythonProject()) {
				const pythonDiagnostics = await this.getPythonDiagnostics()
				diagnostics.push(...pythonDiagnostics)
			}

			this.displayMessage(`🔍 Found ${diagnostics.length} diagnostics`)
			return { diagnostics }
		} catch (error) {
			this.displayMessage(`Error getting diagnostics: ${error}`, "error")
			return { diagnostics: [] }
		}
	}

	/**
	 * Opens problems panel (displays diagnostics in CLI)
	 */
	async openProblemsPanel(_request: proto.host.OpenProblemsPanelRequest): Promise<proto.host.OpenProblemsPanelResponse> {
		this.displayMessage("🔍 Problems Panel")

		// Get current diagnostics and display them
		const diagnosticsResponse = await this.getDiagnostics({})

		if (diagnosticsResponse.diagnostics.length === 0) {
			this.displayMessage("✅ No problems found")
		} else {
			this.displayMessage(`Found ${diagnosticsResponse.diagnostics.length} problems:`)
			diagnosticsResponse.diagnostics.forEach((diagnostic, index) => {
				const severity =
					diagnostic.severity === proto.host.DiagnosticSeverity.ERROR
						? "ERROR"
						: diagnostic.severity === proto.host.DiagnosticSeverity.WARNING
							? "WARNING"
							: "INFO"
				this.displayMessage(`  ${index + 1}. [${severity}] ${diagnostic.message}`)
				if (diagnostic.source) {
					this.displayMessage(`     File: ${diagnostic.source}:${diagnostic.line}:${diagnostic.character}`)
				}
			})
		}

		return {}
	}

	/**
	 * Opens file explorer panel (lists directory contents)
	 */
	async openInFileExplorerPanel(
		request: proto.host.OpenInFileExplorerPanelRequest,
	): Promise<proto.host.OpenInFileExplorerPanelResponse> {
		const targetPath = request.path || this.cwd

		try {
			const stats = await fs.stat(targetPath)

			if (stats.isDirectory()) {
				this.displayMessage(`📂 Directory: ${targetPath}`)
				const files = await fs.readdir(targetPath, { withFileTypes: true })

				const sortedFiles = files.sort((a, b) => {
					// Directories first, then alphabetical
					if (a.isDirectory() && !b.isDirectory()) {
						return -1
					}
					if (!a.isDirectory() && b.isDirectory()) {
						return 1
					}
					return a.name.localeCompare(b.name)
				})

				sortedFiles.forEach((file) => {
					const icon = file.isDirectory() ? "📁" : "📄"
					this.displayMessage(`  ${icon} ${file.name}`)
				})
			} else {
				this.displayMessage(`📄 File: ${targetPath}`)
				const stats = await fs.stat(targetPath)
				this.displayMessage(`📏 Size: ${stats.size} bytes`)
				this.displayMessage(`📅 Modified: ${stats.mtime.toISOString()}`)
			}
		} catch (error) {
			this.displayMessage(`Error accessing path: ${error}`, "error")
		}

		return {}
	}

	/**
	 * Opens Cline sidebar panel (CLI equivalent - shows current status)
	 */
	async openClineSidebarPanel(
		_request: proto.host.OpenClineSidebarPanelRequest,
	): Promise<proto.host.OpenClineSidebarPanelResponse> {
		this.displayMessage("🤖 Cline CLI Assistant")
		this.displayMessage("Ready to help with your coding tasks!")
		this.displayMessage(`📁 Current workspace: ${this.cwd}`)

		return {}
	}

	/**
	 * Helper: Check if TypeScript configuration exists
	 */
	private async hasTypeScriptConfig(): Promise<boolean> {
		try {
			await fs.access(path.join(this.cwd, "tsconfig.json"))
			return true
		} catch {
			return false
		}
	}

	/**
	 * Helper: Check if Python project exists
	 */
	private async hasPythonProject(): Promise<boolean> {
		const pythonFiles = ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"]
		for (const file of pythonFiles) {
			try {
				await fs.access(path.join(this.cwd, file))
				return true
			} catch {}
		}
		return false
	}

	/**
	 * Helper: Get TypeScript diagnostics
	 */
	private async getTypeScriptDiagnostics(): Promise<proto.host.Diagnostic[]> {
		return new Promise((resolve) => {
			const tsc = spawn("npx", ["tsc", "--noEmit", "--pretty", "false"], {
				cwd: this.cwd,
				stdio: ["ignore", "pipe", "pipe"],
			})

			let output = ""
			let errorOutput = ""

			tsc.stdout?.on("data", (data) => {
				output += data.toString()
			})

			tsc.stderr?.on("data", (data) => {
				errorOutput += data.toString()
			})

			tsc.on("close", () => {
				const diagnostics = this.parseTypeScriptOutput(output + errorOutput)
				resolve(diagnostics)
			})

			tsc.on("error", () => {
				resolve([])
			})
		})
	}

	/**
	 * Helper: Get Python diagnostics
	 */
	private async getPythonDiagnostics(): Promise<proto.host.Diagnostic[]> {
		return new Promise((resolve) => {
			const flake8 = spawn("flake8", [".", "--format=%(path)s:%(row)d:%(col)d: %(code)s %(text)s"], {
				cwd: this.cwd,
				stdio: ["ignore", "pipe", "pipe"],
			})

			let output = ""

			flake8.stdout?.on("data", (data) => {
				output += data.toString()
			})

			flake8.on("close", () => {
				const diagnostics = this.parsePythonOutput(output)
				resolve(diagnostics)
			})

			flake8.on("error", () => {
				resolve([])
			})
		})
	}

	/**
	 * Helper: Parse TypeScript compiler output
	 */
	private parseTypeScriptOutput(output: string): proto.host.Diagnostic[] {
		const diagnostics: proto.host.Diagnostic[] = []
		const lines = output.split("\n").filter((line) => line.trim())

		for (const line of lines) {
			const match = line.match(/(.+)\((\d+),(\d+)\): (error|warning|info) TS\d+: (.+)/)
			if (match) {
				const [, source, lineNum, charNum, severity, message] = match

				diagnostics.push({
					source: source.trim(),
					line: parseInt(lineNum, 10),
					character: parseInt(charNum, 10),
					severity:
						severity === "error"
							? proto.host.DiagnosticSeverity.ERROR
							: severity === "warning"
								? proto.host.DiagnosticSeverity.WARNING
								: proto.host.DiagnosticSeverity.INFORMATION,
					message: message.trim(),
					code: undefined,
					tags: [],
				})
			}
		}

		return diagnostics
	}

	/**
	 * Helper: Parse Python linter output
	 */
	private parsePythonOutput(output: string): proto.host.Diagnostic[] {
		const diagnostics: proto.host.Diagnostic[] = []
		const lines = output.split("\n").filter((line) => line.trim())

		for (const line of lines) {
			const match = line.match(/(.+):(\d+):(\d+): (\w+) (.+)/)
			if (match) {
				const [, source, lineNum, charNum, code, message] = match

				diagnostics.push({
					source: source.trim(),
					line: parseInt(lineNum, 10),
					character: parseInt(charNum, 10),
					severity: code.startsWith("E")
						? proto.host.DiagnosticSeverity.ERROR
						: code.startsWith("W")
							? proto.host.DiagnosticSeverity.WARNING
							: proto.host.DiagnosticSeverity.INFORMATION,
					message: message.trim(),
					code,
					tags: [],
				})
			}
		}

		return diagnostics
	}

	/**
	 * Read directory contents
	 */
	async readDirectory(dirPath: string): Promise<{ name: string; type: number; size?: number }[]> {
		try {
			const entries = await fs.readdir(dirPath, { withFileTypes: true })
			const result = []

			for (const entry of entries) {
				const entryPath = path.join(dirPath, entry.name)
				let size: number | undefined

				if (entry.isFile()) {
					try {
						const stats = await fs.stat(entryPath)
						size = stats.size
					} catch {
						// Ignore stat errors
					}
				}

				result.push({
					name: entry.name,
					type: entry.isFile() ? 1 : 2, // 1 = file, 2 = directory
					size,
				})
			}

			return result
		} catch (error) {
			throw new Error(`Failed to read directory ${dirPath}: ${error}`)
		}
	}

	/**
	 * Read file contents
	 */
	async readFile(filePath: string): Promise<string> {
		try {
			return await fs.readFile(filePath, "utf-8")
		} catch (error) {
			throw new Error(`Failed to read file ${filePath}: ${error}`)
		}
	}
}
