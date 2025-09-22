import fs from "fs/promises"
import path from "path"
import * as readline from "readline"
import { WindowServiceClientInterface } from "../types/host-bridge-client-types"
import * as proto from "../types/proto"

/**
 * CLI implementation of WindowService client.
 * Handles terminal-based user interactions, file dialogs, and editor operations.
 */
export class CliWindowClient implements WindowServiceClientInterface {
	private outputHandler?: (message: string, type?: "info" | "error" | "warning") => void

	constructor() {}

	/**
	 * Set output handler for displaying messages
	 */
	setOutputHandler(handler: (message: string, type?: "info" | "error" | "warning") => void): void {
		this.outputHandler = handler
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
	 * Create readline interface for user input
	 */
	private createReadlineInterface(): readline.Interface {
		return readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})
	}

	/**
	 * Opens a text document in the CLI (shows file path and basic info)
	 */
	async showTextDocument(request: proto.host.ShowTextDocumentRequest): Promise<proto.host.TextEditorInfo> {
		const filePath = request.path

		try {
			// Check if file exists
			await fs.access(filePath)

			this.displayMessage(`📄 Opening: ${filePath}`)

			return {
				documentPath: filePath,
				viewColumn: request.options?.viewColumn || 1,
				isActive: true,
			}
		} catch (_error) {
			this.displayMessage(`File not found: ${filePath}`, "error")
			throw new Error(`File not found: ${filePath}`)
		}
	}

	/**
	 * Shows file open dialog in terminal
	 */
	async showOpenDialogue(request: proto.host.ShowOpenDialogueRequest): Promise<proto.host.SelectedResources> {
		const rl = this.createReadlineInterface()

		try {
			this.displayMessage("📁 File Selection")
			if (request.openLabel) {
				this.displayMessage(`Purpose: ${request.openLabel}`)
			}

			const question = request.canSelectMany
				? "Enter file/directory paths (comma-separated): "
				: "Enter file/directory path: "

			const answer = await new Promise<string>((resolve) => {
				rl.question(question, resolve)
			})

			if (!answer.trim()) {
				return { paths: [] }
			}

			const paths = request.canSelectMany
				? answer
						.split(",")
						.map((p) => p.trim())
						.filter(Boolean)
				: [answer.trim()]

			// Validate paths exist
			const validPaths = []
			for (const filePath of paths) {
				try {
					await fs.access(filePath)
					validPaths.push(path.resolve(filePath))
				} catch {
					this.displayMessage(`Warning: Path does not exist: ${filePath}`, "warning")
				}
			}

			return { paths: validPaths }
		} finally {
			rl.close()
		}
	}

	/**
	 * Shows a message with optional user choices
	 */
	async showMessage(request: proto.host.ShowMessageRequest): Promise<proto.host.SelectedResponse> {
		const typeMap = {
			[proto.host.ShowMessageType.ERROR]: "error",
			[proto.host.ShowMessageType.WARNING]: "warning",
			[proto.host.ShowMessageType.INFORMATION]: "info",
		}

		const messageType = typeMap[request.type] || "info"
		this.displayMessage(request.message, messageType as "info" | "error" | "warning")

		if (request.options?.detail) {
			this.displayMessage(`Details: ${request.options.detail}`)
		}

		// If no options provided, just display the message
		if (!request.options?.items || request.options.items.length === 0) {
			return { selectedOption: undefined }
		}

		const rl = this.createReadlineInterface()

		try {
			this.displayMessage("Available options:")
			request.options.items.forEach((item, index) => {
				this.displayMessage(`  ${index + 1}. ${item}`)
			})

			const answer = await new Promise<string>((resolve) => {
				rl.question("Select option (number or text): ", resolve)
			})

			// Try to parse as number first
			const numChoice = parseInt(answer.trim(), 10)
			if (!Number.isNaN(numChoice) && numChoice >= 1 && numChoice <= request.options.items.length) {
				return { selectedOption: request.options.items[numChoice - 1] }
			}

			// Try to match text
			const matchingOption = request.options.items.find((item) => item.toLowerCase() === answer.trim().toLowerCase())

			return { selectedOption: matchingOption }
		} finally {
			rl.close()
		}
	}

	/**
	 * Shows input box for user text input
	 */
	async showInputBox(request: proto.host.ShowInputBoxRequest): Promise<proto.host.ShowInputBoxResponse> {
		const rl = this.createReadlineInterface()

		try {
			this.displayMessage(`📝 ${request.title}`)
			if (request.prompt) {
				this.displayMessage(request.prompt)
			}

			const defaultValue = request.value || ""
			const question = defaultValue ? `Enter value (default: "${defaultValue}"): ` : "Enter value: "

			const answer = await new Promise<string>((resolve) => {
				rl.question(question, resolve)
			})

			const response = answer.trim() || defaultValue
			return { response: response || undefined }
		} finally {
			rl.close()
		}
	}

	/**
	 * Shows file save dialog
	 */
	async showSaveDialog(request: proto.host.ShowSaveDialogRequest): Promise<proto.host.ShowSaveDialogResponse> {
		const rl = this.createReadlineInterface()

		try {
			this.displayMessage("💾 Save File")

			const defaultPath = request.options?.defaultPath || ""
			const question = defaultPath ? `Enter save path (default: "${defaultPath}"): ` : "Enter save path: "

			if (request.options?.filters) {
				this.displayMessage("Supported file types:")
				Object.entries(request.options.filters).forEach(([name, filter]: [string, any]) => {
					const extensions = filter.extensions?.map((ext: string) => `.${ext}`).join(", ") || ""
					this.displayMessage(`  ${name}: ${extensions}`)
				})
			}

			const answer = await new Promise<string>((resolve) => {
				rl.question(question, resolve)
			})

			const selectedPath = answer.trim() || defaultPath
			if (!selectedPath) {
				return { selectedPath: undefined }
			}

			return { selectedPath: path.resolve(selectedPath) }
		} finally {
			rl.close()
		}
	}

	/**
	 * Opens a file (displays file information in CLI)
	 */
	async openFile(request: proto.host.OpenFileRequest): Promise<proto.host.OpenFileResponse> {
		try {
			const stats = await fs.stat(request.filePath)
			this.displayMessage(`📂 File: ${request.filePath}`)
			this.displayMessage(`📏 Size: ${stats.size} bytes`)
			this.displayMessage(`📅 Modified: ${stats.mtime.toISOString()}`)
		} catch (error) {
			this.displayMessage(`Error accessing file: ${error}`, "error")
			throw error
		}

		return {}
	}

	/**
	 * Opens settings (placeholder for CLI - could open config file)
	 */
	async openSettings(request: proto.host.OpenSettingsRequest): Promise<proto.host.OpenSettingsResponse> {
		this.displayMessage("⚙️ Settings")
		if (request.query) {
			this.displayMessage(`Search query: ${request.query}`)
		}
		this.displayMessage("CLI settings management not yet implemented")
		return {}
	}

	/**
	 * Gets list of open tabs (not applicable in CLI, returns empty)
	 */
	async getOpenTabs(_request: proto.host.GetOpenTabsRequest): Promise<proto.host.GetOpenTabsResponse> {
		return { paths: [] }
	}

	/**
	 * Gets list of visible tabs (not applicable in CLI, returns empty)
	 */
	async getVisibleTabs(_request: proto.host.GetVisibleTabsRequest): Promise<proto.host.GetVisibleTabsResponse> {
		return { paths: [] }
	}

	/**
	 * Gets active editor info (returns current working directory context)
	 */
	async getActiveEditor(_request: proto.host.GetActiveEditorRequest): Promise<proto.host.GetActiveEditorResponse> {
		return { filePath: undefined }
	}

	/**
	 * Shows an information message
	 */
	async showInformationMessage(message: string): Promise<void> {
		this.displayMessage(message, "info")
	}
}
